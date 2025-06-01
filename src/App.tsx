import {
    BrowserRouter as Router,
    Routes,
    Route,
    useLocation,
    Navigate,
} from 'react-router-dom';
import BrowseBiblePassages from './components/BrowseBiblePassages';
import ViewChapter from './components/ViewChapter';
import ReadBibleChapter from './components/ReadBibleChapter';
import PracticeSetup from './components/PracticeSetup';
import Practice from './components/Practice';
import ViewQuotes from './components/ViewQuotes';
import AddQuote from './components/AddQuote';
import BibleSearch from './components/BibleSearch';
import BibleReadingPlan from './components/BibleReadingPlan';
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

// Create a wrapper component to access location
const AppContent = () => {
    const currentUser = useAppSelector((state) => state.user.currentUser);
    const displayUser = currentUser;
    const isGuestUser = currentUser === GUEST_USER;
    const location = useLocation();
    const buildDateTime = import.meta.env.VITE_BUILD_DATE_TIME || 'Unknown';

    // Check if we're on the login page
    const isLoginPage =
        location.pathname === '/' || location.pathname === '/login';

    return (
        <div className="d-flex flex-column min-vh-100">
            {!isLoginPage && <TopNav/>}
            <div className="flex-grow-1 mb-5">
                <Routes>
                    <Route path="/" element={<Login/>}/>
                    <Route path="/login" element={<Login/>}/>

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
                                <Prayers/>
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