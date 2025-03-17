import {BrowserRouter as Router, Routes, Route, useLocation, Navigate} from 'react-router-dom';
import BrowseBiblePassages from './components/BrowseBiblePassages';
import ViewChapter from './components/ViewChapter';
import ReadBibleChapter from './components/ReadBibleChapter';
import PracticeSetup from './components/PracticeSetup';
import Practice from './components/Practice';
import ViewQuotes from './components/ViewQuotes';
import SearchQuotes from './components/SearchQuotes';
import AddQuote from './components/AddQuote';
import BibleSearch from './components/BibleSearch';
import BibleReadingPlan from './components/BibleReadingPlan';
import MemoryStats from './components/MemoryStats';
import Links from './components/Links';
import Login from './components/Login';
import TopNav from './components/TopNav';
import {useAppSelector} from './store/hooks';
import {USER, GUEST_USER} from './models/constants';
import './App.css';

// Create a wrapper component to access location
const AppContent = () => {
    const currentUser = useAppSelector(state => state.user.currentUser);
    const displayUser = currentUser || USER;
    const isGuestUser = currentUser === GUEST_USER;
    const location = useLocation();
    const buildDateTime = import.meta.env.VITE_BUILD_DATE_TIME || 'Unknown';

    // Check if we're on the login page
    const isLoginPage = location.pathname === '/' || location.pathname === '/login';

    return (
        <div className="d-flex flex-column min-vh-100">
            {!isLoginPage && <TopNav/>}
            <div className="flex-grow-1 mb-5">
                <Routes>
                    <Route path="/" element={<Login/>}/>
                    <Route path="/practiceSetup" element={<PracticeSetup/>}/>
                    <Route path="/readingPlan" element={<BibleReadingPlan/>}/>
                    <Route path="/viewQuotes" element={<ViewQuotes/>}/>
                    <Route
                        path="/addQuote"
                        element={isGuestUser ? <Navigate to="/browseBible" replace/> : <AddQuote/>}
                    />
                    <Route path="/links" element={<Links/>}/>
                    <Route path="/viewChapter" element={<ViewChapter/>}/>
                    <Route path="/search" element={<BibleSearch/>}/>
                    <Route path="/browseBible" element={<BrowseBiblePassages/>}/>
                    <Route path="/login" element={<Login/>}/>
                    <Route path="/practice/:mode/:order" element={<Practice/>}/>
                    <Route path="/readBibleChapter/:translation/:book/:chapter" element={<ReadBibleChapter/>}/>
                    <Route path="/viewQuotes/:quoteId" element={<ViewQuotes/>}/>
                    <Route path="/searchQuotes" element={<SearchQuotes/>}/>
                    <Route path="/memoryStats" element={<MemoryStats/>}/>
                </Routes>
            </div>
            {!isLoginPage && (
                <footer className="bg-dark text-white-50 text-center py-2 mt-4">
                    <small>User: <span className="text-white">{displayUser}</span> | Built: <span
                        className="text-white-50">{buildDateTime}</span></small>
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