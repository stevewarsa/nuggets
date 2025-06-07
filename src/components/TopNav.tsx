import {Navbar, Nav, Container, Toast} from 'react-bootstrap';
import {Link, useNavigate, useLocation} from 'react-router-dom';
import {useState} from 'react';
import {useAppSelector} from '../store/hooks';
import {GUEST_USER} from '../models/constants';
import {bibleService} from '../services/bible-service';
import GoToPassageByRef from './GoToPassageByRef';
import AddEditPrayerModal from './AddEditPrayerModal';

const TopNav = () => {
    const [expanded, setExpanded] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastBg, setToastBg] = useState('#28a745');
    const [showGoToPassage, setShowGoToPassage] = useState(false);
    const [showAddPrayerModal, setShowAddPrayerModal] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();
    const currentUser = useAppSelector((state) => state.user.currentUser);
    const isGuestUser = currentUser === GUEST_USER;
    const isMainUser = !isGuestUser;

    const handleNavigation = (path: string) => {
        setExpanded(false);
        navigate(path);
    };

    const handleCopyToGuest = async () => {
        setExpanded(false);
        try {
            if (!currentUser) return;

            const result = await bibleService.copyDbToAnother(
                currentUser,
                GUEST_USER
            );

            if (result === 'success') {
                setToastMessage('Successfully copied database to Guest user');
                setToastBg('#28a745');
            } else {
                setToastMessage(`Failed to copy database: ${result}`);
                setToastBg('#dc3545');
            }

            setShowToast(true);
        } catch (error) {
            console.error('Error copying database:', error);
            setToastMessage('Error copying database');
            setToastBg('#dc3545');
            setShowToast(true);
        }
    };

    const handleAddPrayer = () => {
        setExpanded(false);
        setShowAddPrayerModal(true);
    };

    const handlePrayerSaved = () => {
        // Show success message
        setToastMessage('Prayer added successfully!');
        setToastBg('#28a745');
        setShowToast(true);
    };

    return (
        <>
            <Navbar
                bg="dark"
                variant="dark"
                expand="lg"
                expanded={expanded}
                onToggle={(expanded) => setExpanded(expanded)}
            >
                <Container>
                    <Navbar.Brand
                        as={Link}
                        to="/browseBible"
                        onClick={() => setExpanded(false)}
                    >
                        Bible Nuggets
                    </Navbar.Brand>
                    <Navbar.Toggle aria-controls="basic-navbar-nav"/>
                    <Navbar.Collapse id="basic-navbar-nav">
                        <Nav className="me-auto">
                            {location.pathname !== '/practiceSetup' && (
                                <Nav.Link onClick={() => handleNavigation('/practiceSetup')}>
                                    Practice Setup
                                </Nav.Link>
                            )}
                            {location.pathname !== '/readingPlan' && (
                                <Nav.Link onClick={() => handleNavigation('/readingPlan')}>
                                    Reading Plan
                                </Nav.Link>
                            )}
                            {location.pathname !== '/viewQuotes' && (
                                <Nav.Link onClick={() => handleNavigation('/viewQuotes')}>
                                    View Quotes
                                </Nav.Link>
                            )}
                            {location.pathname !== '/prayers' && (
                                <Nav.Link onClick={() => handleNavigation('/prayers')}>
                                    Prayers
                                </Nav.Link>
                            )}
                            {isMainUser && <Nav.Link onClick={handleAddPrayer}>
                                Add Prayer
                            </Nav.Link>}
                            {!isGuestUser && location.pathname !== '/addQuote' && (
                                <Nav.Link onClick={() => handleNavigation('/addQuote')}>
                                    Add Quote
                                </Nav.Link>
                            )}
                            {location.pathname !== '/links' && (
                                <Nav.Link onClick={() => handleNavigation('/links')}>
                                    Links
                                </Nav.Link>
                            )}
                            {location.pathname !== '/viewChapter' && (
                                <Nav.Link onClick={() => handleNavigation('/viewChapter')}>
                                    View Chapter
                                </Nav.Link>
                            )}
                            {location.pathname !== '/search' && (
                                <Nav.Link onClick={() => handleNavigation('/search')}>
                                    Bible Search
                                </Nav.Link>
                            )}
                            <Nav.Link onClick={() => {
                                setExpanded(false);
                                setShowGoToPassage(true);
                            }}>
                                Go To Passage
                            </Nav.Link>
                            {isMainUser && currentUser === 'SteveWarsa' && (
                                <Nav.Link onClick={handleCopyToGuest}>
                                    Copy This DB to Guest
                                </Nav.Link>
                            )}
                            {location.pathname !== '/browseBible' && (
                                <Nav.Link onClick={() => handleNavigation('/browseBible')}>
                                    Browse Bible
                                </Nav.Link>
                            )}
                            {location.pathname !== '/memoryStats' && (
                                <Nav.Link onClick={() => handleNavigation('/memoryStats')}>
                                    Memory Stats
                                </Nav.Link>
                            )}
                            {location.pathname !== '/memoryPracticeHistory' && (
                                <Nav.Link
                                    onClick={() => handleNavigation('/memoryPracticeHistory')}
                                >
                                    Practice History
                                </Nav.Link>
                            )}
                            {location.pathname !== '/searchQuotes' && (
                                <Nav.Link onClick={() => handleNavigation('/searchQuotes')}>
                                    Search Quotes
                                </Nav.Link>
                            )}
                            {location.pathname !== '/memoryPassages' && (
                                <Nav.Link onClick={() => handleNavigation('/memoryPassages')}>
                                    My Memory Passages
                                </Nav.Link>
                            )}
                            {location.pathname !== '/login' && (
                                <Nav.Link onClick={() => handleNavigation('/login')}>
                                    Login
                                </Nav.Link>
                            )}
                        </Nav>
                    </Navbar.Collapse>
                </Container>
            </Navbar>

            <GoToPassageByRef
                show={showGoToPassage}
                onHide={() => setShowGoToPassage(false)}
                onNavigate={handleNavigation}
            />

            <AddEditPrayerModal
                show={showAddPrayerModal}
                onHide={() => setShowAddPrayerModal(false)}
                onPrayerSaved={handlePrayerSaved}
            />

            <Toast
                onClose={() => setShowToast(false)}
                show={showToast}
                delay={3000}
                autohide
                style={{
                    position: 'fixed',
                    top: 20,
                    right: 20,
                    background: toastBg,
                    color: 'white',
                    zIndex: 9999,
                }}
            >
                <Toast.Body>{toastMessage}</Toast.Body>
            </Toast>
        </>
    );
};

export default TopNav;