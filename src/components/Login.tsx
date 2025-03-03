import { useState, useEffect } from 'react';
import { Container, Form, Button, Spinner, Card, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { bibleService } from '../services/bible-service';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setUser, setAllUsers } from '../store/userSlice';

const LOCAL_STORAGE_USER_KEY = 'user.name';

const Login = () => {
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [newUser, setNewUser] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const allUsers = useAppSelector(state => state.user.allUsers);
  const currentUser = useAppSelector(state => state.user.currentUser);

  useEffect(() => {
    const checkUserAndFetch = async () => {
      try {
        setIsLoading(true);
        
        // First check if we have users in Redux store
        let userList = allUsers;
        
        // If Redux store doesn't have users, fetch them from API
        if (!userList || userList.length === 0) {
          console.log("Login.tsx - No users in Redux store, fetching from API...");
          userList = await bibleService.getAllUsers();
          dispatch(setAllUsers(userList));
        } else {
          console.log("Login.tsx - Using users from Redux store, count:", userList.length);
        }
        
        // Only perform auto-login if the user isn't already logged in
        // This prevents auto-login when a user explicitly navigates to the login page
        if (!currentUser) {
          // Check for saved user in local storage
          const savedUser = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
          if (savedUser) {
            // Verify the saved user exists in the user list
            const userExists = userList.some(user => user.userName === savedUser);
            if (userExists) {
              console.log("Login.tsx - Local storage user " + savedUser + " exists. Auto-logging in...");
              // Auto-login with saved user
              dispatch(setUser(savedUser));
              navigate('/browseBible');
              return;
            } else {
              console.log("Login.tsx - Saved user not found in user list:", savedUser);
              localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
            }
          }
        } else {
          console.log("Login.tsx - User already logged in as:", currentUser, "- skipping auto-login");
        }
      } catch (error) {
        console.error('Error fetching users:', error);
        setError('Failed to load users. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    checkUserAndFetch();
  }, [dispatch, navigate, allUsers, currentUser]);

  const handleUserSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedUser(value);
    if (value) {
      setError(null);
    }
  };

  const handleNewUserChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewUser(value);
    if (value) {
      setError(null);
    }
  };

  const handleLogin = async () => {
    if (newUser && !selectedUser) {
      setError('Please select an existing user to copy from');
      return;
    }
    
    const username = newUser || selectedUser;
    if (!username) {
      setError('Please select an existing user or enter a new username');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      if (newUser) {
        // New user needs to be created via API with a user to copy from
        const result = await bibleService.nuggetLogin(newUser, selectedUser);
        if (result !== 'success') {
          setError(`Failed to create new user: ${result}`);
          setIsSubmitting(false);
          return;
        }
      }
      
      // Store the user in Redux
      dispatch(setUser(username));
      
      // Save to local storage if remember me is checked
      if (rememberMe) {
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, username);
      }
      
      // Navigate to the browse Bible page
      navigate('/browseBible');
    } catch (error) {
      console.error('Login error:', error);
      setError('An error occurred during login. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <Container className="py-5">
      <Card className="mx-auto" style={{ maxWidth: '500px', background: '#212529', color: 'white' }}>
        <Card.Header className="text-center">
          <h2>Bible Nuggets Login</h2>
        </Card.Header>
        <Card.Body>
          {isLoading ? (
            <div className="text-center py-4">
              <Spinner animation="border" role="status" />
              <p className="mt-2">Loading users...</p>
            </div>
          ) : (
            <Form onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
              {error && (
                <Alert variant="danger" className="mb-4">
                  {error}
                </Alert>
              )}
              
              <Form.Group className="mb-4">
                <Form.Label>{newUser ? 'Copy User' : 'Select User'}</Form.Label>
                <Form.Select 
                  value={selectedUser}
                  onChange={handleUserSelect}
                  disabled={isSubmitting}
                >
                  <option value="">-- Select a user --</option>
                  {allUsers.map((user) => (
                    <option key={user.userName} value={user.userName}>
                      {user.userName} (Last active: {user.lastModified})
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label>New User</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter new username (no spaces)"
                  value={newUser}
                  onChange={handleNewUserChange}
                  disabled={isSubmitting}
                />
                <Form.Text className="text-muted">
                  Username should not contain spaces
                </Form.Text>
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Check
                  type="checkbox"
                  id="remember-me"
                  label="Remember Me"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isSubmitting}
                />
              </Form.Group>

              <div className="d-grid">
                <Button 
                  variant="primary" 
                  size="lg"
                  onClick={handleLogin}
                  disabled={(newUser && !selectedUser) || (!selectedUser && !newUser) || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        role="status"
                        aria-hidden="true"
                        className="me-2"
                      />
                      Logging in...
                    </>
                  ) : (
                    'Login'
                  )}
                </Button>
              </div>
            </Form>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Login;