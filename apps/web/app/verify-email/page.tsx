'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { LucideLoader2 } from 'lucide-react';

function VerifyEmailContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const token = searchParams.get('token');
        const orgslug = searchParams.get('orgslug') || 'default';

        if (!token) {
            setStatus('error');
            setMessage('Invalid verification link. No token provided.');
            return;
        }

        // Call your API to verify the email using fetch
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://lms-backend.africanainetwork.com/api/v1';

        fetch(`${apiUrl}/auth/verify-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token: token
            })
        })
            .then(async (response) => {
                const data = await response.json();

                if (response.ok) {
                    setStatus('success');
                    setMessage('Email verified successfully! Redirecting to login...');

                    // Redirect to login after 3 seconds
                    setTimeout(() => {
                        router.push(`/login?orgslug=${orgslug}`);
                    }, 3000);
                } else {
                    throw new Error(data.detail || data.message || 'Verification failed');
                }
            })
            .catch((error: Error) => {
                setStatus('error');
                const errorMessage = error.message || 'Verification failed. The link may have expired.';
                setMessage(errorMessage);
            });
    }, [searchParams, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
            <div className="max-w-md w-full bg-white shadow-xl rounded-2xl p-8 border border-gray-100 mx-4">
                {status === 'loading' && (
                    <div className="text-center space-y-4">
                        <div className="flex justify-center">
                            <LucideLoader2 className="h-16 w-16 animate-spin text-indigo-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">Verifying your email...</h2>
                        <p className="text-gray-500">Please wait while we confirm your email address.</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="text-center space-y-4">
                        <div className="bg-green-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto">
                            <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-green-600">Success!</h2>
                        <p className="text-gray-600">{message}</p>
                        <div className="flex items-center justify-center text-sm text-gray-500 gap-2">
                            <LucideLoader2 className="h-4 w-4 animate-spin" />
                            <span>Redirecting...</span>
                        </div>
                    </div>
                )}

                {status === 'error' && (
                    <div className="text-center space-y-4">
                        <div className="bg-red-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto">
                            <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-red-600">Verification Failed</h2>
                        <p className="text-gray-600 text-sm">{message}</p>
                        <div className="space-y-3 pt-4">
                            <button
                                onClick={() => router.push('/auth/signup?orgslug=default')}
                                className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
                            >
                                Back to Signup
                            </button>
                            <button
                                onClick={() => router.push('/login?orgslug=default')}
                                className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
                            >
                                Go to Login
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <LucideLoader2 className="h-16 w-16 animate-spin text-indigo-600" />
            </div>
        }>
            <VerifyEmailContent />
        </Suspense>
    );
}