import { IconType } from 'react-icons';
import {
    SiNetflix, SiSpotify, SiYoutube, SiAmazonprime,
    SiApplemusic, SiHbo, SiDiscord, SiAdobe, SiGithub, SiOpenai
} from 'react-icons/si';
import { FaTv, FaFilm } from 'react-icons/fa';
import { StorefrontIcon } from '@phosphor-icons/react';

export interface SubscriptionPlan {
    name: string;
    priceKas: number;   // Primary: Price in KAS
    priceUsd: number;   // Secondary: USD equivalent for display
    features: string[];
}

export interface Service {
    id: string;
    name: string;
    category: 'streaming' | 'music' | 'social' | 'creative' | 'developer' | 'ai' | 'other';
    color: string;
    icon: IconType;
    description: string;
    plans: SubscriptionPlan[];
}

export const SERVICES: Service[] = [
    {
        id: 'netflix',
        name: 'Netflix',
        category: 'streaming',
        color: '#E50914',
        icon: SiNetflix,
        description: 'Stream movies and TV shows',
        plans: [
            { name: 'Basic', priceKas: 66.6, priceUsd: 9.99, features: ['720p', '1 screen', 'Unlimited content'] },
            { name: 'Standard', priceKas: 103.3, priceUsd: 15.49, features: ['1080p', '2 screens', 'Downloads'] },
            { name: 'Premium', priceKas: 133.3, priceUsd: 19.99, features: ['4K+HDR', '4 screens', 'Spatial audio'] }
        ]
    },
    {
        id: 'spotify',
        name: 'Spotify',
        category: 'music',
        color: '#1DB954',
        icon: SiSpotify,
        description: 'Music streaming service',
        plans: [
            { name: 'Free', priceKas: 0, priceUsd: 0, features: ['Ads', 'Shuffle play', 'Limited skips'] },
            { name: 'Premium', priceKas: 73.3, priceUsd: 10.99, features: ['Ad-free', 'Download', 'High quality'] },
            { name: 'Family', priceKas: 113.3, priceUsd: 16.99, features: ['6 accounts', 'Kid profiles', 'Ad-free'] }
        ]
    },
    {
        id: 'youtube',
        name: 'YouTube Premium',
        category: 'streaming',
        color: '#FF0000',
        icon: SiYoutube,
        description: 'Ad-free videos and music',
        plans: [
            { name: 'Individual', priceKas: 93.3, priceUsd: 13.99, features: ['Ad-free', 'Background play', 'Downloads'] },
            { name: 'Family', priceKas: 153.3, priceUsd: 22.99, features: ['5 members', 'YouTube Music', 'Ad-free'] }
        ]
    },
    {
        id: 'disney',
        name: 'Disney+',
        category: 'streaming',
        color: '#113CCF',
        icon: FaFilm,
        description: 'Disney, Pixar, Marvel & more',
        plans: [
            { name: 'Basic', priceKas: 53.3, priceUsd: 7.99, features: ['With ads', '1080p', 'Download'] },
            { name: 'Premium', priceKas: 93.3, priceUsd: 13.99, features: ['No ads', '4K UHD', '4 streams'] }
        ]
    },
    {
        id: 'prime',
        name: 'Amazon Prime',
        category: 'streaming',
        color: '#FF9900',
        icon: SiAmazonprime,
        description: 'Free shipping + streaming',
        plans: [
            { name: 'Monthly', priceKas: 100, priceUsd: 14.99, features: ['Free shipping', 'Prime Video', 'Prime Music'] },
            { name: 'Annual', priceKas: 926.7, priceUsd: 139, features: ['All benefits', 'Save $40/year'] }
        ]
    },
    {
        id: 'apple-music',
        name: 'Apple Music',
        category: 'music',
        color: '#FC3C44',
        icon: SiApplemusic,
        description: '100M+ songs streaming',
        plans: [
            { name: 'Individual', priceKas: 73.3, priceUsd: 10.99, features: ['Lossless', 'Spatial Audio', 'Offline'] },
            { name: 'Family', priceKas: 113.3, priceUsd: 16.99, features: ['6 members', 'All features'] }
        ]
    },
    {
        id: 'hbo',
        name: 'HBO Max',
        category: 'streaming',
        color: '#8540F5',
        icon: SiHbo,
        description: 'HBO originals & blockbusters',
        plans: [
            { name: 'With Ads', priceKas: 66.6, priceUsd: 9.99, features: ['1080p', 'Limited ads', 'Download'] },
            { name: 'Ad-Free', priceKas: 106.6, priceUsd: 15.99, features: ['4K', 'No ads', '4 streams'] }
        ]
    },
    {
        id: 'hulu',
        name: 'Hulu',
        category: 'streaming',
        color: '#1CE783',
        icon: FaTv,
        description: 'TV shows next day',
        plans: [
            { name: 'Basic', priceKas: 53.3, priceUsd: 7.99, features: ['With ads', 'Streaming library'] },
            { name: 'No Ads', priceKas: 120, priceUsd: 17.99, features: ['Ad-free', 'Download', 'Live TV'] }
        ]
    },
    {
        id: 'discord',
        name: 'Discord Nitro',
        category: 'social',
        color: '#5865F2',
        icon: SiDiscord,
        description: 'Enhanced Discord experience',
        plans: [
            { name: 'Basic', priceKas: 20, priceUsd: 2.99, features: ['Custom emoji', '50MB uploads'] },
            { name: 'Nitro', priceKas: 66.6, priceUsd: 9.99, features: ['Boosts', '500MB uploads', 'HD streaming'] }
        ]
    },
    {
        id: 'adobe',
        name: 'Adobe Creative Cloud',
        category: 'creative',
        color: '#FF0000',
        icon: SiAdobe,
        description: 'Design & creative tools',
        plans: [
            { name: 'Photography', priceKas: 66.6, priceUsd: 9.99, features: ['Photoshop', 'Lightroom', '20GB'] },
            { name: 'Single App', priceKas: 153.3, priceUsd: 22.99, features: ['1 app', '100GB', 'Adobe Fonts'] },
            { name: 'All Apps', priceKas: 366.6, priceUsd: 54.99, features: ['20+ apps', '100GB', 'Portfolio'] }
        ]
    },
    {
        id: 'github',
        name: 'GitHub Pro',
        category: 'developer',
        color: '#24292F',
        icon: SiGithub,
        description: 'Advanced collaboration',
        plans: [
            { name: 'Pro', priceKas: 26.7, priceUsd: 4, features: ['Private repos', 'Insights', 'Protected branches'] },
            { name: 'Team', priceKas: 26.7, priceUsd: 4, features: ['Per user', 'Team discussions', 'SAML SSO'] }
        ]
    },
    {
        id: 'chatgpt',
        name: 'ChatGPT Plus',
        category: 'ai',
        color: '#10A37F',
        icon: SiOpenai,
        description: 'Advanced AI assistant',
        plans: [
            { name: 'Plus', priceKas: 133.3, priceUsd: 20, features: ['GPT-4', 'Priority access', 'Faster response'] }
        ]
    }
];

export const CATEGORIES = [
    { id: 'all', name: 'All Services', count: SERVICES.length },
    { id: 'streaming', name: 'Streaming', count: SERVICES.filter(s => s.category === 'streaming').length },
    { id: 'music', name: 'Music', count: SERVICES.filter(s => s.category === 'music').length },
    { id: 'social', name: 'Social', count: SERVICES.filter(s => s.category === 'social').length },
    { id: 'creative', name: 'Creative', count: SERVICES.filter(s => s.category === 'creative').length },
    { id: 'developer', name: 'Developer', count: SERVICES.filter(s => s.category === 'developer').length },
    { id: 'ai', name: 'AI', count: SERVICES.filter(s => s.category === 'ai').length },
    { id: 'other', name: 'Other', count: 0 }
];
