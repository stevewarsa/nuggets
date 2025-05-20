import {ReactNode, useEffect} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {useAppSelector} from '../store/hooks';

interface ProtectedRouteProps {
    children: ReactNode;
}

const ProtectedRoute = ({children}: ProtectedRouteProps) => {
    const navigate = useNavigate();
    const location = useLocation();
    const currentUser = useAppSelector((state) => state.user.currentUser);

    useEffect(() => {
        if (!currentUser && location.pathname !== '/login') {
            // Store the current location to redirect back after login
            navigate('/login', {state: {from: location.pathname}});
        }
    }, [currentUser, location, navigate]);

    return <>{children}</>;
};

export default ProtectedRoute;