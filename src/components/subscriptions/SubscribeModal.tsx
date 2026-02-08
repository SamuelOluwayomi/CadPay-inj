'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XIcon, CheckIcon, EnvelopeSimpleIcon, WarningIcon, LockKeyIcon, FingerprintIcon } from '@phosphor-icons/react';
import { Service, SubscriptionPlan } from '@/data/subscriptions';
import Loader from '@/components/shared/Loader';
import { useKaspaPayment } from '@/hooks/useKaspaPayment';
import { useToast } from '@/context/ToastContext';

interface SubscribeModalProps {
    isOpen: boolean;
    onClose: () =\u003e void;
service: Service | null;
onSubscribe: (serviceId: string, plan: SubscriptionPlan, email: string, txId: string) =\u003e Promise\u003cvoid\u003e;
balance: number;
existingSubscriptions ?: Array\u003c{ serviceId: string; email: string } \u003e;
}

const MERCHANT_WALLET = "kaspa test:qzrr3jngvdkh4pupuqn0y2rrwg5x9g2tlwshygsql4d8vekc0nnewcec5rjay";

export default function SubscribeModal({ isOpen, onClose, service, onSubscribe, balance, existingSubscriptions = [] }: SubscribeModalProps) {
    const [step, setStep] = useState\u003c'plans' | 'email' | 'verify' | 'loading' | 'success'\u003e('plans');
    const [selectedPlan, setSelectedPlan] = useState\u003cSubscriptionPlan | null\u003e(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [useBiometric, setUseBiometric] = useState(false);
    const [error, setError] = useState('');
    const { sendPayment, isProcessing } = useKaspaPayment();
    const { showToast } = useToast();

    useEffect(() =\u003e {
        if(isOpen) {
            setStep('plans');
            setSelectedPlan(null);
            setEmail('');
            setPassword('');
            setUseBiometric(false);
            setError('');
        }
    }, [isOpen, service]);

    if (!service) return null;

    // Check if user has sufficient KAS balance
    const sufficientFunds = selectedPlan ? balance \u003e = selectedPlan.priceKas : true;

    const handlePayment = async() =\u003e {
        if (!selectedPlan) return;

    if (!sufficientFunds) {
        setError(`Insufficient KAS! Need ${selectedPlan.priceKas.toFixed(2)} KAS but only have ${balance.toFixed(2)} KAS`);
        return;
    }

    if (!useBiometric \u0026\u0026!password) {
        setError('Please enter your password or use biometric verification');
        return;
    }

    setStep('loading');
    setError('');

    try {
        // Send payment to merchant wallet
        const paymentResult = await sendPayment(
            MERCHANT_WALLET,
            selectedPlan.priceKas,
            useBiometric ? undefined : password
        );

        if (!paymentResult.success || !paymentResult.txId) {
            throw new Error(paymentResult.error || 'Payment failed');
        }

        // Record subscription with transaction ID
        await onSubscribe(service.id, selectedPlan, email, paymentResult.txId);

        setStep('success');
        showToast(`Subscription activated! ${selectedPlan.priceKas} KAS sent`, 'success');

        setTimeout(() =\u003e {
            onClose();
        }, 2500);
    } catch (err: any) {
        console.error(err);
        setError(err.message || 'Subscription failed');
        setStep('verify');
    }
};

return (
\u003cAnimatePresence\u003e
{
    isOpen \u0026\u0026(
        \u003c\u003e
        \u003cmotion.div
                        initial = {{ opacity: 0 }}
animate = {{ opacity: 1 }}
exit = {{ opacity: 0 }}
onClick = { onClose }
className = "fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
    /\u003e

\u003cmotion.div
initial = {{ opacity: 0, scale: 0.9, y: 20 }}
animate = {{ opacity: 1, scale: 1, y: 0 }}
exit = {{ opacity: 0, scale: 0.9, y: 20 }}
className = "fixed inset-0 z-50 flex items-center justify-center p-4"
\u003e
\u003cdiv className = "bg-zinc-900 border border-white/10 rounded-3xl p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"\u003e
{/* Header */ }
\u003cdiv className = "flex items-center justify-between mb-6"\u003e
\u003cdiv className = "flex items-center gap-4"\u003e
\u003cdiv
className = "text-4xl p-3 rounded-xl flex items-center justify-center"
style = {{ backgroundColor: `${service.color}20`, color: service.color }}
\u003e
\u003cservice.icon size = { 40} /\u003e
\u003c / div\u003e
\u003cdiv\u003e
\u003ch2 className = "text-2xl font-bold text-white"\u003e{ service.name } \u003c / h2\u003e
\u003cp className = "text-zinc-400 text-sm"\u003e{ service.description } \u003c / p\u003e
\u003c / div\u003e
\u003c / div\u003e
\u003cbutton onClick = { onClose } className = "text-zinc-400 hover:text-white transition-colors"\u003e
\u003cXIcon size = { 24} /\u003e
\u003c / button\u003e
\u003c / div\u003e

{
    error \u0026\u0026(
        \u003cdiv className = "mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3"\u003e
        \u003cWarningIcon size = { 20} className = "text-red-400 shrink-0 mt-0.5" /\u003e
        \u003cp className = "text-sm text-red-400"\u003e{ error }\u003c / p\u003e
        \u003c / div\u003e
    )
}

{/* Plan Selection */ }
{
    step === 'plans' \u0026\u0026(
        \u003cmotion.div initial = {{ opacity: 0, x: 20 }} animate = {{ opacity: 1, x: 0 }}\u003e
\u003ch3 className = "text-lg font-bold text-white mb-4"\u003eChoose a Plan\u003c / h3\u003e
\u003cdiv className = "grid gap-4"\u003e
{
    service.plans.map((plan, idx) =\u003e(
        \u003cdiv
                                                key = { idx }
                                                onClick = {() =\u003e setSelectedPlan(plan)}
className = {`p-5 rounded-xl border-2 cursor-pointer transition-all ${selectedPlan?.name === plan.name
    ? 'border-white/30 bg-white/5'
    : 'border-white/10 hover:border-white/20'
    }`}
\u003e
\u003cdiv className = "flex items-start justify-between mb-3"\u003e
\u003cdiv\u003e
\u003ch4 className = "text-lg font-bold text-white"\u003e{ plan.name } \u003c / h4\u003e
{/* KAS Price - PRIMARY */ }
\u003cp className = "text-3xl font-bold mt-1" style = {{ color: service.color }}\u003e
{ plan.priceKas.toFixed(2) } \u003cspan className = "text-lg"\u003eKAS\u003c / span\u003e
\u003cspan className = "text-sm text-zinc-500"\u003e / month\u003c / span\u003e
\u003c / p\u003e
{/* USD Equivalent - SECONDARY */ }
\u003cp className = "text-xs text-zinc-500 mt-1"\u003e
                                                            ≈ ${ plan.priceUsd.toFixed(2) } USD
\u003c / p\u003e
\u003c / div\u003e
\u003cdiv className = {`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedPlan?.name === plan.name
    ? 'border-white bg-white'
    : 'border-zinc-600'
    }`}\u003e
{
    selectedPlan?.name === plan.name \u0026\u0026(
        \u003cdiv className = "w-2 h-2 rounded-full" style = {{ backgroundColor: service.color }} /\u003e
                                                        )}
\u003c / div\u003e
\u003c / div\u003e
\u003cul className = "space-y-2"\u003e
{
    plan.features.map((feature, i) =\u003e(
        \u003cli key = { i } className = "flex items-center gap-2 text-sm text-zinc-400"\u003e
        \u003cCheckIcon size = { 16} weight = "bold" className = "text-green-400 shrink-0" /\u003e
                                                            { feature }
        \u003c / li\u003e
    ))
}
\u003c / ul\u003e
\u003c / div\u003e
                                        ))}
\u003c / div\u003e
\u003cbutton
onClick = {() =\u003e selectedPlan \u0026\u0026 setStep('email')}
disabled = {!selectedPlan}
className = "w-full mt-6 py-4 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
style = {{
    backgroundColor: service.color,
        color: 'white'
}}
\u003e
Continue
\u003c / button\u003e
\u003c / motion.div\u003e
                            )}

{/* Email Input */ }
{
    step === 'email' \u0026\u0026 selectedPlan \u0026\u0026(
        \u003cmotion.div initial = {{ opacity: 0, x: 20 }} animate = {{ opacity: 1, x: 0 }}\u003e
\u003ch3 className = "text-lg font-bold text-white mb-4"\u003eLink Your Account\u003c / h3\u003e
\u003cp className = "text-sm text-zinc-400 mb-6"\u003e
                                        Enter the email associated with your { service.name } account
\u003c / p\u003e
\u003cdiv className = "mb-6"\u003e
\u003clabel className = "block text-sm text-zinc-400 mb-2"\u003eEmail Address\u003c / label\u003e
\u003cdiv className = "relative"\u003e
\u003cinput
type = "email"
value = { email }
onChange = {(e) =\u003e {
    setEmail(e.target.value);
    setError('');
}}
placeholder = "you@gmail.com"
className = "w-full px-4 py-3 pl-12 bg-zinc-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-white/30"
autoFocus
    /\u003e
\u003cEnvelopeSimpleIcon size = { 20} className = "absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" /\u003e
\u003c / div\u003e
\u003c / div\u003e

\u003cdiv className = "flex gap-3"\u003e
\u003cbutton
onClick = {() =\u003e setStep('plans')}
className = "flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-colors"
\u003e
Back
\u003c / button\u003e
\u003cbutton
onClick = {() =\u003e {
    if (!/\\S+@\\S+\\.\\S+/.test(email)) {
        setError('Please enter a valid email address');
        return;
    }
    // Check for duplicate
    const isDuplicate = existingSubscriptions.some(
        sub =\u003e sub.serviceId === service.id \u0026\u0026 sub.email.toLowerCase() === email.toLowerCase()
    );
    if (isDuplicate) {
        setError(`This email already has an active ${service.name} subscription!`);
        return;
    }
    setStep('verify');
}}
disabled = {!email}
className = "flex-1 py-3 font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
style = {{ backgroundColor: service.color, color: 'white' }}
\u003e
Continue
\u003c / button\u003e
\u003c / div\u003e
\u003c / motion.div\u003e
                            )}

{/* Verification \u0026 Confirmation */ }
{
    step === 'verify' \u0026\u0026 selectedPlan \u0026\u0026(
        \u003cmotion.div initial = {{ opacity: 0, x: 20 }} animate = {{ opacity: 1, x: 0 }}\u003e
\u003ch3 className = "text-lg font-bold text-white mb-4"\u003eConfirm \u0026 Pay\u003c / h3\u003e

{/* Summary */ }
\u003cdiv className = "bg-zinc-800/50 rounded-xl p-5 mb-6 space-y-3"\u003e
\u003cdiv className = "flex justify-between"\u003e
\u003cspan className = "text-zinc-400"\u003eService\u003c / span\u003e
\u003cspan className = "text-white font-medium"\u003e{ service.name } \u003c / span\u003e
\u003c / div\u003e
\u003cdiv className = "flex justify-between"\u003e
\u003cspan className = "text-zinc-400"\u003ePlan\u003c / span\u003e
\u003cspan className = "text-white font-medium"\u003e{ selectedPlan.name } \u003c / span\u003e
\u003c / div\u003e
\u003cdiv className = "flex justify-between"\u003e
\u003cspan className = "text-zinc-400"\u003eEmail\u003c / span\u003e
\u003cspan className = "text-white font-medium"\u003e{ email } \u003c / span\u003e
\u003c / div\u003e
\u003cdiv className = "border-t border-white/10 pt-3 mt-3"\u003e
\u003cdiv className = "flex justify-between items-end"\u003e
\u003cspan className = "text-zinc-400"\u003eCost\u003c / span\u003e
\u003cdiv className = "text-right"\u003e
\u003cp className = "text-3xl font-bold text-white"\u003e{ selectedPlan.priceKas.toFixed(2) } KAS\u003c / p\u003e
\u003cp className = "text-xs text-zinc-500"\u003e≈ ${ selectedPlan.priceUsd.toFixed(2) } USD / month\u003c / p\u003e
\u003c / div\u003e
\u003c / div\u003e
\u003c / div\u003e
\u003cdiv className = "flex justify-between pt-3 border-t border-white/10"\u003e
\u003cspan className = "text-zinc-400"\u003eYour Balance\u003c / span\u003e
\u003cspan className = {`font-medium ${!sufficientFunds ? 'text-red-400' : 'text-green-400'}`}\u003e
{ balance.toFixed(2) } KAS
\u003c / span\u003e
\u003c / div\u003e
\u003c / div\u003e

{
    !sufficientFunds \u0026\u0026(
        \u003cdiv className = "mb-4 p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl flex items-start gap-3"\u003e
        \u003cWarningIcon size = { 20} className = "text-orange-400 shrink-0 mt-0.5" /\u003e
        \u003cdiv className = "text-sm"\u003e
        \u003cp className = "text-orange-400 font-medium mb-1"\u003eInsufficient Funds\u003c / p\u003e
        \u003cp className = "text-orange-200/60"\u003ePlease add funds using the 'Fund Wallet' button.\u003c / p\u003e
        \u003c / div\u003e
        \u003c / div\u003e
    )
}

{/* Verification Method */ }
\u003cdiv className = "mb-6"\u003e
\u003clabel className = "block text-sm text-zinc-400 mb-3"\u003eVerify Payment\u003c / label\u003e

{/* Verification Toggle */ }
\u003cdiv className = "grid grid-cols-2 gap-3 mb-4"\u003e
\u003cbutton
onClick = {() =\u003e setUseBiometric(false)}
className = {`p-3 rounded-xl border-2 transition-all ${!useBiometric
    ? 'border-white/30 bg-white/5'
    : 'border-white/10 hover:border-white/20'
    }`}
\u003e
\u003cLockKeyIcon size = { 24} className = "mx-auto mb-2" style = {{ color: service.color }} /\u003e
\u003cp className = "text-sm font-medium text-white"\u003ePassword\u003c / p\u003e
\u003c / button\u003e
\u003cbutton
onClick = {() =\u003e setUseBiometric(true)}
className = {`p-3 rounded-xl border-2 transition-all ${useBiometric
    ? 'border-white/30 bg-white/5'
    : 'border-white/10 hover:border-white/20'
    }`}
\u003e
\u003cFingerprintIcon size = { 24} className = "mx-auto mb-2" style = {{ color: service.color }} /\u003e
\u003cp className = "text-sm font-medium text-white"\u003eBiometric\u003c / p\u003e
\u003c / button\u003e
\u003c / div\u003e

{/* Password Input */ }
{
    !useBiometric \u0026\u0026(
        \u003cdiv className = "relative"\u003e
        \u003cinput
                                                    type = "password"
                                                    value = { password }
                                                    onChange = {(e) =\u003e setPassword(e.target.value)}
placeholder = "Enter your password"
className = "w-full px-4 py-3 pl-12 bg-zinc-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-white/30"
    /\u003e
\u003cLockKeyIcon size = { 20} className = "absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" /\u003e
\u003c / div\u003e
                                        )}
\u003c / div\u003e

\u003cdiv className = "flex gap-3"\u003e
\u003cbutton
onClick = {() =\u003e setStep('email')}
className = "flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-colors"
\u003e
Back
\u003c / button\u003e
\u003cbutton
onClick = { handlePayment }
disabled = {!sufficientFunds || isProcessing || (!useBiometric \u0026\u0026!password)}
className = "flex-1 py-3 font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
style = {{ backgroundColor: service.color, color: 'white' }}
\u003e
{ useBiometric ? 'Verify \u0026 Pay' : 'Confirm \u0026 Pay' }
\u003c / button\u003e
\u003c / div\u003e
\u003c / motion.div\u003e
                            )}

{/* Loading */ }
{
    step === 'loading' \u0026\u0026(
        \u003cmotion.div initial = {{ opacity: 0, scale: 0.9 }} animate = {{ opacity: 1, scale: 1 }} className = "text-center py-12"\u003e
\u003cLoader size = "lg" className = "mx-auto mb-6" /\u003e
\u003ch3 className = "text-xl font-bold text-white mb-2"\u003eProcessing Payment...\u003c / h3\u003e
\u003cp className = "text-zinc-400"\u003e
{ useBiometric ? 'Please verify with your biometric device' : 'Signing transaction...' }
\u003c / p\u003e
\u003c / motion.div\u003e
                            )}

{/* Success */ }
{
    step === 'success' \u0026\u0026(
        \u003cmotion.div initial = {{ opacity: 0, scale: 0.9 }} animate = {{ opacity: 1, scale: 1 }} className = "text-center py-8"\u003e
\u003cdiv
className = "w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
style = {{ backgroundColor: `${service.color}20`, color: service.color }}
\u003e
\u003cCheckIcon size = { 40} weight = "bold" /\u003e
\u003c / div\u003e
\u003ch3 className = "text-xl font-bold text-white mb-2"\u003eSubscription Activated!\u003c / h3\u003e
\u003cp className = "text-zinc-400"\u003eWelcome to { service.name } { selectedPlan?.name } \u003c / p\u003e
\u003c / motion.div\u003e
                            )}
\u003c / div\u003e
\u003c / motion.div\u003e
\u003c /\u003e
            )}
\u003c / AnimatePresence\u003e
    );
}
