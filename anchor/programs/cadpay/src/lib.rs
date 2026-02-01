use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, Mint};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("6VvJbGzNHbtZLWxmLTYPpRz2F3oMDxdL1YRgV3b51Ccz");

#[program]
pub mod cadpay_profiles {
    use super::*;

    pub fn initialize_user(
        ctx: Context<InitializeUser>, 
        username: [u8; 16], 
        emoji: [u8; 4], 
        gender: [u8; 8], 
        pin: [u8; 4]
    ) -> Result<()> {
        let user_profile = &mut ctx.accounts.user_profile;
        user_profile.username = username;
        user_profile.emoji = emoji;
        user_profile.gender = gender;
        user_profile.pin = pin;
        user_profile.authority = ctx.accounts.user.key();
        Ok(())
    }

    pub fn update_user(
        ctx: Context<UpdateUser>, 
        username: [u8; 16], 
        emoji: [u8; 4], 
        gender: [u8; 8], 
        pin: [u8; 4]
    ) -> Result<()> {
        let user_profile = &mut ctx.accounts.user_profile;
        user_profile.username = username;
        user_profile.emoji = emoji;
        user_profile.gender = gender;
        user_profile.pin = pin;
        Ok(())
    }

    pub fn create_savings_pot(
        ctx: Context<CreateSavingsPot>,
        pot_name: String,
        unlock_time: u64,
    ) -> Result<()> {
        // Use full scope for errors
        require!(pot_name.len() > 0 && pot_name.len() <= 32, CadpayError::InvalidPotName);
        require!(unlock_time > 0, CadpayError::InvalidUnlockTime);

        let savings_pot = &mut ctx.accounts.savings_pot;
        savings_pot.authority = ctx.accounts.user.key();
        savings_pot.name = pot_name;
        savings_pot.unlock_time = unlock_time;
        savings_pot.balance = 0;
        savings_pot.created_at = Clock::get()?.unix_timestamp as u64;
        savings_pot.bump = ctx.bumps.savings_pot; // Updated syntax for clarity
        Ok(())
    }

    pub fn deposit_to_pot(
        ctx: Context<DepositToPot>,
        amount: u64,
    ) -> Result<()> {
        require!(amount > 0, CadpayError::InvalidAmount);

        let cpi_accounts = Transfer {
            from: ctx.accounts.user_ata.to_account_info(),
            to: ctx.accounts.pot_ata.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        let savings_pot = &mut ctx.accounts.savings_pot;
        savings_pot.balance = savings_pot.balance.checked_add(amount).ok_or(CadpayError::BalanceOverflow)?;
        Ok(())
    }

    pub fn withdraw_from_pot(
        ctx: Context<WithdrawFromPot>,
        amount: u64,
    ) -> Result<()> {
        let savings_pot = &mut ctx.accounts.savings_pot;
        
        let current_time = Clock::get()?.unix_timestamp as u64;
        require!(current_time >= savings_pot.unlock_time, CadpayError::PotLocked);
        require!(amount > 0 && amount <= savings_pot.balance, CadpayError::InvalidWithdrawalAmount);

        let seeds = &[
            b"savings-pot-v1",
            savings_pot.authority.as_ref(),
            savings_pot.name.as_bytes(),
            &[savings_pot.bump],
        ];
        let signer_seeds = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.pot_ata.to_account_info(),
            to: ctx.accounts.recipient_ata.to_account_info(),
            authority: savings_pot.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
        token::transfer(cpi_ctx, amount)?;

        savings_pot.balance = savings_pot.balance.checked_sub(amount).ok_or(CadpayError::BalanceUnderflow)?;
        Ok(())
    }

    pub fn close_savings_pot(
        _ctx: Context<CloseSavingsPot>,
    ) -> Result<()> {
        // Rent is returned to authority via closing constraint
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeUser<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + 32 + 16 + 4 + 8 + 4, 
        seeds = [b"user-profile-v1", user.key().as_ref()],
        bump
    )]
    pub user_profile: Account<'info, UserProfile>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateUser<'info> {
    #[account(
        mut,
        seeds = [b"user-profile-v1", user.key().as_ref()],
        bump,
        has_one = authority,
    )]
    pub user_profile: Account<'info, UserProfile>,
    pub user: Signer<'info>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(pot_name: String)]
pub struct CreateSavingsPot<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + 32 + (4 + 32) + 8 + 8 + 8 + 1,
        seeds = [b"savings-pot-v1", user.key().as_ref(), pot_name.as_bytes()],
        bump
    )]
    pub savings_pot: Account<'info, SavingsPot>,

    #[account(
        init,
        payer = user,
        associated_token::mint = mint,
        associated_token::authority = savings_pot,
    )]
    pub pot_ata: Account<'info, TokenAccount>,

    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct DepositToPot<'info> {
    #[account(
        mut,
        seeds = [b"savings-pot-v1", savings_pot.authority.as_ref(), savings_pot.name.as_bytes()],
        bump = savings_pot.bump,
    )]
    pub savings_pot: Account<'info, SavingsPot>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub user_ata: Account<'info, TokenAccount>,
    #[account(mut)]
    pub pot_ata: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct WithdrawFromPot<'info> {
    #[account(
        mut,
        seeds = [b"savings-pot-v1", savings_pot.authority.as_ref(), savings_pot.name.as_bytes()],
        bump = savings_pot.bump,
        has_one = authority,
    )]
    pub savings_pot: Account<'info, SavingsPot>,
    pub authority: Signer<'info>,
    #[account(mut)]
    pub pot_ata: Account<'info, TokenAccount>,
    #[account(mut)]
    pub recipient_ata: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CloseSavingsPot<'info> {
    #[account(
        mut,
        seeds = [b"savings-pot-v1", savings_pot.authority.as_ref(), savings_pot.name.as_bytes()],
        bump = savings_pot.bump,
        has_one = authority,
        close = authority,
    )]
    pub savings_pot: Account<'info, SavingsPot>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct UserProfile {
    pub authority: Pubkey,
    pub username: [u8; 16],
    pub emoji: [u8; 4],
    pub gender: [u8; 8],
    pub pin: [u8; 4],
}

#[account]
pub struct SavingsPot {
    pub authority: Pubkey,
    pub name: String,
    pub unlock_time: u64,
    pub balance: u64,
    pub created_at: u64,
    pub bump: u8,
}

#[error_code]
pub enum CadpayError {
    #[msg("Invalid pot name")]
    InvalidPotName,
    #[msg("Invalid unlock time")]
    InvalidUnlockTime,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Invalid withdrawal amount")]
    InvalidWithdrawalAmount,
    #[msg("Pot is still locked")]
    PotLocked,
    #[msg("Balance overflow")]
    BalanceOverflow,
    #[msg("Balance underflow")]
    BalanceUnderflow,
}
