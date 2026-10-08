import {
    BrowserRouter as Router,
    Routes,
    Route,
    useLocation,
    Navigate,
} from 'react-router-dom';
import { useEffect, useState } from 'react';
import { offlineCache } from './services/offline-cache';
import BrowseBiblePassages from './components/BrowseBiblePassages';
import ViewChapter from './components/ViewChapter';
import ReadBibleChapter from './components/ReadBibleChapter';
import PracticeSetup from './components/PracticeSetup';
import Practice from './components/Practice';
import PracticeOffline from './components/PracticeOffline';
import ViewQuotes from './components/ViewQuotes';
import AddQuote from './components/AddQuote';
import BibleSearch from './components/BibleSearch';
import BibleReadingPlan from './components/BibleReadingPlan';
import BibleReadThroughs from './components/BibleReadThroughs';
import MemoryStats from './components/MemoryStats';
import Links from './components/Links';
import Login from './components/Login';
import TopNav from './components/TopNav';
import {useAppSelector} from './store/hooks';
import {GUEST_USER} from './models/constants';
import './App.css';
import ViewMemoryPracticeHistory from './components/ViewMemoryPracticeHistory';
import SearchQuotes from './components/SearchQuotes';
import ProtectedRoute from './components/ProtectedRoute';
import MemoryPassages from './components/MemoryPassages.tsx';
import Prayers from './components/Prayers.tsx';
import ViewPrayerHistory from './components/ViewPrayerHistory';
import Objections from './components/Objections.tsx';
import PracticeObjections from './components/PracticeObjections.tsx';
import MemoryPassagesByBox from "./components/MemoryPassagesByBox.tsx";
import ManageBoxes from './components/ManageBoxes';
import PublicReadBibleChapter from './components/PublicReadBibleChapter';
import PublicViewQuotes from "./components/PublicViewQuotes.tsx";
import ImportMemoryPassages from './components/ImportMemoryPassages';

// Create a wrapper component to access location
const AppContent = () => {
    const currentUser = useAppSelector((state) => state.user.currentUser);
    const displayUser = currentUser;
    const isGuestUser = currentUser === GUEST_USER;
    const location = useLocation();
    const buildDateTime = import.meta.env.VITE_BUILD_DATE_TIME || 'Unknown';

    const [pendingSyncCount, setPendingSyncCount] = useState(0);
    const [showSyncBanner, setShowSyncBanner] = useState(false);

    const refreshPendingCount = async () => {
        if (isGuestUser) return;
        const count = await offlineCache.getQueuedCount();
        setPendingSyncCount(count);
        setShowSyncBanner(count > 0);
    };

    useEffect(() => {
        refreshPendingCount();
    }, [isGuestUser, location.pathname]);

    useEffect(() => {
        const interval = setInterval(() => {
            refreshPendingCount();
        }, 4000);
        return () => clearInterval(interval);
    }, [isGuestUser]);

    useEffect(() => {
        const handleOnline = async () => {
            if (isGuestUser) return;
            const result = await offlineCache.syncLastViewedQueue(currentUser);
            setPendingSyncCount(result.failed);
            setShowSyncBanner(result.failed > 0);
        };
        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [isGuestUser, currentUser]);

    // Check if we're on the login page
    const isLoginPage =
        location.pathname === '/' || location.pathname === '/login';

    return (
        <div className="d-flex flex-column min-vh-100">
            {!isLoginPage && <TopNav/>}
            {!isLoginPage && showSyncBanner && pendingSyncCount > 0 && (
                <div
                    style={{
                        background: '#ffc107',
                        color: '#212529',
                        textAlign: 'center',
                        padding: '6px 12px',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                    }}
                    onClick={async () => {
                        if (isGuestUser) return;
                        const result = await offlineCache.syncLastViewedQueue(currentUser);
                        setPendingSyncCount(result.failed);
                        setShowSyncBanner(result.failed > 0);
                    }}
                >
                    {pendingSyncCount} practice update{pendingSyncCount !== 1 ? 's' : ''} pending due to connection loss — tap to retry now, or it will sync automatically when back online.
                </div>
            )}
            <div className="flex-grow-1 mb-5">
                <Routes>
                    <Route path="/" element={<Login/>}/>
                    <Route path="/login" element={<Login/>}/>

                    {/* Public route for Bible reading - automatically logs in as guest */}
                    <Route
                        path="/read/:translation/:book/:chapter/:scrollToVerse"
                        element={<PublicReadBibleChapter/>}
                    />
                    <Route
                        path="/read/:translation/:book/:chapter"
                        element={<PublicReadBibleChapter/>}
                    />
                    {/* Public route for viewing quotes - automatically logs in as guest */}
                    <Route
                        path="/quotes"
                        element={<PublicViewQuotes/>}
                    />
                    <Route
                        path="/quotes/:quoteId"
                        element={<PublicViewQuotes/>}
                    />
                    <Route
                        path="/practiceSetup"
                        element={
                            <ProtectedRoute>
                                <PracticeSetup/>
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/readingPlan"
                        element={
                            <ProtectedRoute>
                                <BibleReadingPlan/>
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/readThroughs"
                        element={
                            <ProtectedRoute>
                                <BibleReadThroughs/>
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/viewQuotes"
                        element={
                            <ProtectedRoute>
                                <ViewQuotes/>
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/addQuote"
                        element={
                            <ProtectedRoute>
                                {isGuestUser ? (
                                    <Navigate to="/browseBible" replace/>
                                ) : (
                                    <AddQuote/>
                                )}
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/links"
                        element={
                            <ProtectedRoute>
                                <Links/>
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/viewChapter"
                        element={
                            <ProtectedRoute>
                                <ViewChapter/>
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/search"
                        element={
                            <ProtectedRoute>
                                <BibleSearch/>
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/browseBible"
                        element={
                            <ProtectedRoute>
                                <BrowseBiblePassages/>
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/practice/:mode/:order"
                        element={
                            <ProtectedRoute>
                                <Practice/>
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/practiceOffline/:mode/:order"
                        element={
                            <ProtectedRoute>
                                <PracticeOffline/>
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/readBibleChapter/:translation/:book/:chapter/:scrollToVerse"
                        element={
                            <ProtectedRoute>
                                <ReadBibleChapter/>
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/readBibleChapter/:translation/:book/:chapter"
                        element={
                            <ProtectedRoute>
                                <ReadBibleChapter/>
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/viewQuotes/:quoteId"
                        element={
                            <ProtectedRoute>
                                <ViewQuotes/>
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/searchQuotes"
                        element={
                            <ProtectedRoute>
                                <SearchQuotes/>
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/memoryPracticeHistory"
                        element={
                            <ProtectedRoute>
                                <ViewMemoryPracticeHistory/>
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/memoryStats"
                        element={
                            <ProtectedRoute>
                                <MemoryStats/>
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/prayers"
                        element={
                            <ProtectedRoute>
                                {isGuestUser ? (
                                    <Navigate to="/browseBible" replace/>
                                ) : (
                                    <Prayers/>
                                )}
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/prayerHistory"
                        element={
                            <ProtectedRoute>
                                {isGuestUser ? (
                                    <Navigate to="/browseBible" replace/>
                                ) : (
                                    <ViewPrayerHistory/>
                                )}
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/memoryPassagesByBox"
                        element={
                            <ProtectedRoute>
                                <MemoryPassagesByBox/>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/manageBoxes"
                        element={
                            <ProtectedRoute>
                                <ManageBoxes/>
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/memoryPassages"
                        element={
                            <ProtectedRoute>
                                <MemoryPassages/>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/importMemoryPassages"
                        element={
                            <ProtectedRoute>
                                {isGuestUser ? (
                                    <Navigate to="/browseBible" replace/>
                                ) : (
                                    <ImportMemoryPassages/>
                                )}
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/objections"
                        element={
                            <ProtectedRoute>
                                {isGuestUser ? (
                                    <Navigate to="/browseBible" replace/>
                                ) : (
                                    <Objections/>
                                )}
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/practiceObjections"
                        element={
                            <ProtectedRoute>
                                {isGuestUser ? (
                                    <Navigate to="/browseBible" replace/>
                                ) : (
                                    <PracticeObjections/>
                                )}
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </div>
            {!isLoginPage && (
                <footer className="bg-dark text-white-50 text-center py-2 mt-4">
                    <small>
                        User: <span className="text-white">{displayUser}</span> | Built:{' '}
                        <span className="text-white-50">{buildDateTime}</span>
                    </small>
                </footer>
            )}
        </div>
    );
};

const App = () => {
    const basename = import.meta.env.DEV ? '' : '/nuggets';

    return (
        <Router basename={basename}>
            <AppContent/>
        </Router>
    );
};

export default App;