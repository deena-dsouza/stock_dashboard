

import React, { useState, useEffect, useCallback, useRef } from 'react';
// Correct Firebase Imports
import { initializeApp } from 'firebase/app'; 
import { 
    getAuth, onAuthStateChanged, signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, signOut, signInWithCustomToken, signInAnonymously
} from 'firebase/auth'; 
import { 
    getFirestore, doc, setDoc, deleteDoc, collection, 
    onSnapshot, serverTimestamp, setLogLevel 
} from 'firebase/firestore';

// --- Configuration ---
const STOCKS = ["GOOG", "TSLA", "AMZN", "META", "NVDA"];
const PRICE_UPDATE_INTERVAL_MS = 1000; // 1 second update

// Utility function to generate a random price change
const generateRandomPrice = (currentPrice) => {
    const volatility = 0.005; // 0.5% max change
    const change = (Math.random() - 0.5) * currentPrice * volatility;
    const newPrice = Math.max(1, currentPrice + change); // Ensure price > 0
    return parseFloat(newPrice.toFixed(2));
};

// --- Authentication Form Component ---
const AuthForm = ({ auth, isLogin, setIsLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleAuth = async (e) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
            }
        } catch (err) {
            let message = "An unknown error occurred during authentication.";
            if (err.code && err.code.includes('auth/')) {
                message = err.message.replace(/Firebase: /, '').replace(/\(auth\/.*?\)\.?/g, '').trim();
            }
            

            setError(message);
            console.error("Auth Error:", err);
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        setError(null);
        setEmail('');
        setPassword('');
    }, [isLogin]);

    return (
        <div className="max-w-md mx-auto p-8 bg-white rounded-xl shadow-2xl mt-10">
            <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">
                {isLogin ? "Sign In to Your Broker Account" : "Create Account"}
            </h2>
            <form onSubmit={handleAuth}>
                <p className="text-red-800">Please do sign up first. </p>
                <br></br>
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full p-3 mb-4 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                />
                <input
                    type="password"
                    placeholder="Password (min 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full p-3 mb-6 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                />
                
                {error && (
                    <p className="text-red-500 text-sm mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full p-3 text-lg font-semibold rounded-lg text-white transition duration-200 ${
                        isLoading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-300'
                    }`}
                >
                    {isLoading ? (
                        <span className="flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-white border-dashed rounded-full animate-spin mr-2"></div>
                            Processing...
                        </span>
                    ) : (
                        isLogin ? "Sign In" : "Sign Up"
                    )}
                </button>
            </form>
            
            <p className="mt-4 text-center text-gray-600">
                {isLogin ? "Don't have an account?" : "Already have an account?"}
                <button 
                    onClick={() => setIsLogin(!isLogin)}
                    className="ml-2 text-indigo-600 font-semibold hover:text-indigo-800 transition"
                >
                    {isLogin ? "Sign Up" : "Sign In"}
                </button>
            </p>
        </div>
    );
};

// --- Component: My Subscribed Stocks Card (Table View) ---
const MySubscriptionsCard = ({ subscribedStocks, getStockData, toggleSubscription }) => {
    const activeStocks = subscribedStocks.filter(ticker => STOCKS.includes(ticker));
    
    if (activeStocks.length === 0) {
        return (
            <div className="bg-white p-6 rounded-xl shadow-xl border border-gray-50 mb-8">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    My Subscribed Stocks
                </h2>
                <div className="text-center p-8 bg-indigo-50 rounded-lg">
                    <p className="text-gray-600 font-semibold">You are not currently subscribed to any stocks.</p>
                    <p className="text-sm text-gray-500 mt-1">Use the section below to start tracking real-time prices!</p>
                </div>
            </div>
        );
    }
    
    return (
        <div className="bg-white p-6 rounded-xl shadow-xl border border-gray-50 mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                My Subscribed Stocks
            </h2>
            
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ticker</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Price</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                        {activeStocks.map(ticker => {
                            const { price, isRising, isFalling } = getStockData(ticker);

                            // Determine background color for the price pill
                            let priceColor = 'bg-gray-500';
                            if (isRising) priceColor = 'bg-green-600';
                            if (isFalling) priceColor = 'bg-red-600';

                            return (
                                <tr key={ticker} className="hover:bg-indigo-50 transition duration-150 ease-in-out">
                                    <td className="px-4 py-3 whitespace-nowrap text-lg font-bold text-gray-900">{ticker}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-mono">
                                        <div className="inline-flex items-center">
                                            <span className={`px-3 py-1 rounded-full text-white font-semibold shadow-md transition-colors duration-500 ${priceColor}`}>
                                                ${price !== 'N/A' ? price : '--'}
                                            </span>
                                            {isRising && <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2 text-green-500 animate-pulse" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>}
                                            {isFalling && <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2 text-red-500 animate-pulse" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 112 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-right">
                                        <button 
                                            onClick={() => toggleSubscription(ticker)}
                                            className="px-4 py-1.5 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition duration-150 ease-in-out shadow-md shadow-red-200"
                                        >
                                            Unsubscribe
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- Component: Available Stocks Card (Pill View) ---
const AvailableStocksCard = ({ allStocks, getStockData, toggleSubscription }) => {
    const unsubscribedStocks = allStocks.filter(ticker => !getStockData(ticker).isSubscribed);

    if (unsubscribedStocks.length === 0) {
        return null; // Don't show if all are subscribed
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-xl border border-gray-50">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.27a11.957 11.957 0 01-7.009-1.977l-4.757 4.757A4.996 4.996 0 005 17h14a2 2 0 002-2V9a2 2 0 00-2-2h-3.382z" />
                </svg>
                Available Stocks to Subscribe
            </h2>
            <div className="flex flex-wrap gap-4">
                {unsubscribedStocks.map(ticker => (
                    <button
                        key={ticker}
                        onClick={() => toggleSubscription(ticker)}
                        className="flex items-center px-4 py-2 bg-indigo-100 text-indigo-700 font-semibold rounded-full hover:bg-indigo-200 transition duration-150 shadow-sm hover:shadow-md"
                    >
                        {ticker}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                ))}
            </div>
        </div>
    );
};


// --- Main App Component ---
export default function App() {
    // 1. Environment and Config Access (Mandatory)
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
    
    // User's hardcoded config, used as a fallback if the environment config is unavailable/bad
    const USER_PROVIDED_FALLBACK_CONFIG = {
        apiKey: "AIzaSyDnVz4G-MpzkSI5ctXwk3X9Z9C_DcKCbJc",
        authDomain: "stock-dashboard-cd031.firebaseapp.com",
        projectId: "stock-dashboard-cd031",
        storageBucket: "stock-dashboard-cd031.firebasestorage.app",
        messagingSenderId: "938499745516",
        appId: "1:938499745516:web:f90943b00e6c244c53e7c9"
    };

    let firebaseConfig;
    try {
        const configString = typeof __firebase_config !== 'undefined' ? __firebase_config : '{}';
        const parsedConfig = JSON.parse(configString);
        // Use the parsed config if it has keys, otherwise use the fallback
        firebaseConfig = Object.keys(parsedConfig).length > 0 ? parsedConfig : USER_PROVIDED_FALLBACK_CONFIG;
    } catch (e) {
        console.error("Failed to parse environment firebase config. Using user-provided fallback.", e);
        firebaseConfig = USER_PROVIDED_FALLBACK_CONFIG;
    }


    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [user, setUser] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);

    const [isLogin, setIsLogin] = useState(true);
    const [subscribedStocks, setSubscribedStocks] = useState([]);
    const [currentPrices, setCurrentPrices] = useState({});

    const priceRef = useRef({}); 
    const pricesInitializedRef = useRef(false);

    // 2. FIREBASE INITIALIZATION AND AUTHENTICATION
    useEffect(() => {
        if (!firebaseConfig || Object.keys(firebaseConfig).length === 0) {
            console.error("Firebase config is missing or invalid. Cannot initialize Firebase.");
            setIsAuthReady(true);
            return;
        }

        const app = initializeApp(firebaseConfig);
        const firestore = getFirestore(app);
        const authService = getAuth(app);
        
        setDb(firestore);
        setAuth(authService);
        
        setLogLevel('debug'); 

        const unsubscribe = onAuthStateChanged(authService, async (u) => {
            if (u) {
                setUser(u);
            } else {
                setUser(null);
                
                // Sign in using the custom token if provided, otherwise sign in anonymously
                if (initialAuthToken) {
                    try {
                        await signInWithCustomToken(authService, initialAuthToken);
                    } catch (error) {
                        console.error("Custom token authentication failed:", error);
                        await signInAnonymously(authService);
                    }
                } else {
                    await signInAnonymously(authService);
                }
            }
            setIsAuthReady(true);
        });

        return () => unsubscribe();
    }, [initialAuthToken, JSON.stringify(firebaseConfig)]); 

    // 3. REAL-TIME STOCK PRICE GENERATOR (Simulates a server push to public data)
    useEffect(() => {
        if (!db) return; 

        // Path: /artifacts/{appId}/public/data/stock_prices
        const pricesRef = collection(db, 'artifacts', appId, 'public', 'data', 'stock_prices');
        
        const updatePrices = async () => {
            if (!pricesInitializedRef.current) {
                STOCKS.forEach(ticker => {
                    // Initialize with a random starting price
                    priceRef.current[ticker] = { 
                        ticker, 
                        price: 100 + Math.random() * 50,
                        lastUpdate: serverTimestamp() 
                    };
                });
                pricesInitializedRef.current = true;
            }

            const batchPromises = [];
            STOCKS.forEach(ticker => {
                const current = priceRef.current[ticker]?.price || 100;
                const newPrice = generateRandomPrice(current);
                
                const newDocRef = doc(pricesRef, ticker);
                
                // Update Firestore for real-time listener to pick up
                batchPromises.push(setDoc(newDocRef, {
                    ticker: ticker,
                    price: newPrice,
                    previousPrice: current, 
                    lastUpdate: serverTimestamp()
                }));
                
                // Update local ref immediately for next iteration
                priceRef.current[ticker] = { 
                    ...priceRef.current[ticker], 
                    price: newPrice 
                };
            });

            await Promise.all(batchPromises).catch(e => console.error("Error updating stock prices batch:", e));
        };

        // Start the price update simulation
        const priceInterval = setInterval(updatePrices, PRICE_UPDATE_INTERVAL_MS);

        return () => clearInterval(priceInterval);
    }, [db, appId]); 

    // 4. REAL-TIME LISTENERS (Subscriptions and Prices)
    useEffect(() => {
        if (!db || !isAuthReady) return;

        // A. Listen to ALL Stock Prices (Public Data)
        const allPricesRef = collection(db, 'artifacts', appId, 'public', 'data', 'stock_prices');
        const unsubscribePrices = onSnapshot(allPricesRef, (snapshot) => {
            const prices = {};
            snapshot.forEach(doc => {
                const data = doc.data();
                prices[data.ticker] = data;
            });
            setCurrentPrices(prices);
        }, (error) => {
            console.error("Error listening to prices:", error);
        });
        
        let unsubscribeSubscriptions = () => {};

        // B. Listen to User's Subscriptions (Private Data)
        if (user && user.uid) {
            // Path: /artifacts/{appId}/users/{userId}/subscriptions
            const subscriptionsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'subscriptions');
            unsubscribeSubscriptions = onSnapshot(subscriptionsRef, (snapshot) => {
                // The document ID is the ticker name
                const subs = snapshot.docs.map((d) => d.id);
                setSubscribedStocks(subs);
            }, (error) => {
                console.error("Error listening to subscriptions:", error);
            });
        } else {
            setSubscribedStocks([]); 
        }

        return () => {
            unsubscribePrices();
            unsubscribeSubscriptions();
        };
    }, [db, user, isAuthReady, appId]);

    // --- Subscription Management Actions ---
    const toggleSubscription = useCallback(async (ticker) => {
        if (!db || !user || !user.uid) return;
        
        // Document reference uses the user's private data path
        const subDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'subscriptions', ticker);
        
        try {
            if (subscribedStocks.includes(ticker)) {
                // Unsubscribe: Delete the document
                await deleteDoc(subDocRef);
            } else {
                // Subscribe: Create the document
                await setDoc(subDocRef, {
                    ticker: ticker,
                    subscribedAt: serverTimestamp()
                });
            }
        } catch (e) {
            console.error(`Error toggling subscription for ${ticker}:`, e);
        }
    }, [db, user, subscribedStocks, appId]);

    // --- Derived State and Rendering Helpers ---
    const getStockData = useCallback((ticker) => {
        const data = currentPrices[ticker];
        const isSubscribed = subscribedStocks.includes(ticker);
        const price = data?.price || 'N/A';
        const previousPrice = data?.previousPrice || null;
        
        const currentPriceFloat = parseFloat(price);
        // Compare current price with the previous price to determine movement
        const isRising = previousPrice && currentPriceFloat > previousPrice;
        const isFalling = previousPrice && currentPriceFloat < previousPrice;

        return {
            price: currentPriceFloat !== 'N/A' ? currentPriceFloat.toFixed(2) : 'N/A',
            isSubscribed,
            isRising,
            isFalling,
            lastUpdate: data?.lastUpdate?.toDate ? data.lastUpdate.toDate() : null
        };
    }, [currentPrices, subscribedStocks]);


    const Header = ({ email, userId, auth }) => (
        <header className="bg-gray-900 shadow-xl p-4 md:p-6 text-white rounded-t-xl">
            <div className="flex justify-between items-start md:items-center flex-wrap gap-4">
                <h1 className="text-3xl font-extrabold text-indigo-400">
                    Broker Client Dashboard
                </h1>
                <div className="text-right text-sm">
                    <p className="font-semibold truncate max-w-[200px] sm:max-w-none">{email}</p>

                    <button 
                        onClick={() => signOut(auth)}
                        className="mt-1 px-3 py-1 text-xs bg-red-700 hover:bg-red-600 rounded-full transition shadow-md"
                    >
                        Log Out
                    </button>
                </div>
            </div>
        </header>
    );

    const LoadingState = () => (
        <div className="flex justify-center items-center h-screen bg-gray-100">
            <div className="flex flex-col items-center p-6 bg-white rounded-xl shadow-2xl">
                <div className="w-12 h-12 border-4 border-indigo-400 border-dashed rounded-full animate-spin"></div>
                <p className="mt-4 text-lg font-semibold text-gray-700">Connecting to Broker Services...</p>
            </div>
        </div>
    );

    // Initial loading or waiting for auth check
    if (!isAuthReady || !auth) {
        return <LoadingState />;
    }

    // Authentication UI
    if (!user || user.isAnonymous) {
        return (
            <div className="min-h-screen bg-gray-100 p-4 md:p-8 font-sans">
                <div className="text-center mb-6">
                    <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Broker Client Dashboard</h1>
                </div>
                
                <AuthForm auth={auth} isLogin={isLogin} setIsLogin={setIsLogin} />
            </div>
        );
    }


    // Dashboard UI (Authenticated User)
    return (
        <div className="min-h-screen bg-gray-100 p-4 md:p-8 font-sans">
            <div className="max-w-4xl mx-auto">
                <Header email={user.email || 'User'} userId={user.uid} auth={auth} />
                <main className="py-8">
                    {/* My Subscribed Stocks Card */}
                    <MySubscriptionsCard 
                        subscribedStocks={subscribedStocks} 
                        getStockData={getStockData} 
                        toggleSubscription={toggleSubscription} 
                    />
                    
                    {/* Available Stocks to Subscribe Card (Pill View) */}
                    <AvailableStocksCard
                        allStocks={STOCKS}
                        getStockData={getStockData}
                        toggleSubscription={toggleSubscription}
                    />
                </main>
            </div>
        </div>
    );
}


