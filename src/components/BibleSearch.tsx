import React from 'react';
import { Container } from 'react-bootstrap';
import BibleSearchForm from './BibleSearchForm';

const BibleSearch: React.FC = () => {
    return (
        <Container className="py-4">
            <h1 className="text-white mb-4">Bible Search</h1>
            <BibleSearchForm />
        </Container>
    );
};

export default BibleSearch;
