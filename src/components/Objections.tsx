import React, { useState, useEffect } from 'react';
import {
    Button,
    Card,
    Container,
    Form,
    InputGroup,
    Modal,
    Spinner,
    Badge,
    Toast,
    OverlayTrigger,
    Tooltip,
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArrowLeft,
    faChevronRight,
    faPlus,
    faPencilAlt,
    faArchive,
    faFolder,
    faCommentDots,
    faGraduationCap,
    faSearch,
    faTimes,
} from '@fortawesome/free-solid-svg-icons';
import { bibleService } from '../services/bible-service';
import { useAppSelector } from '../store/hooks';
import { useToast } from '../hooks/useToast';
import {
    Objection,
    ObjectionCategory,
    ANSWER_TYPE_LABELS,
    AnswerType,
} from '../models/objection';
import AddEditObjectionModal from './AddEditObjectionModal';

const Objections: React.FC = () => {
    const navigate = useNavigate();
    const { showToast, toastProps, toastMessage } = useToast();
    const user = useAppSelector((state) => state.user.currentUser);

    const [categories, setCategories] = useState<ObjectionCategory[]>([]);
    const [allObjections, setAllObjections] = useState<Objection[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Drill-down state: null = root level, number = current category id
    const [currentCategoryId, setCurrentCategoryId] = useState<number | null>(null);
    // Breadcrumb trail of categories from root to current
    const [breadcrumb, setBreadcrumb] = useState<ObjectionCategory[]>([]);

    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingObjection, setEditingObjection] = useState<Objection | null>(null);
    const [showArchiveModal, setShowArchiveModal] = useState(false);
    const [archiveTarget, setArchiveTarget] = useState<Objection | null>(null);
    const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [isAddingCategory, setIsAddingCategory] = useState(false);

    const fetchObjectionsData = async () => {
        if (!user) return;
        try {
            setIsLoading(true);
            const [cats, objs] = await Promise.all([
                bibleService.getObjectionCategories(user),
                bibleService.getObjections(user, undefined, true, true),
            ]);
            setCategories(cats);
            setAllObjections(objs);
        } catch (error) {
            console.error('Error fetching objections data:', error);
            showToast({ message: 'Error loading objections', variant: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchObjectionsData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    // Derived data for current view
    const childCategories = categories.filter(
        (c) => c.parentId === currentCategoryId
    );

    const objectionsInCurrentCategory = allObjections.filter(
        (o) => o.categoryId === currentCategoryId && o.archiveFl === 'N'
    );

    // Search results: search across all non-archived objections
    const searchResults: Objection[] = searchTerm.trim()
        ? allObjections.filter(
            (o) =>
                o.archiveFl === 'N' &&
                (o.objectionText
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase()) ||
                    (o.answers || []).some((a) =>
                        a.answerText
                            .toLowerCase()
                            .includes(searchTerm.toLowerCase())
                    ))
        )
        : [];

    const handleCategoryClick = (category: ObjectionCategory) => {
        setBreadcrumb((prev) => [...prev, category]);
        setCurrentCategoryId(category.categoryId);
    };

    const handleBack = () => {
        setBreadcrumb((prev) => prev.slice(0, -1));
        setCurrentCategoryId(
            breadcrumb.length > 0
                ? breadcrumb[breadcrumb.length - 2]?.categoryId ?? null
                : null
        );
    };

    const handleBreadcrumbClick = (index: number) => {
        if (index < 0) {
            setBreadcrumb([]);
            setCurrentCategoryId(null);
        } else {
            setBreadcrumb(breadcrumb.slice(0, index + 1));
            setCurrentCategoryId(breadcrumb[index].categoryId);
        }
    };

    const handleAddObjection = () => {
        setEditingObjection(null);
        setShowAddModal(true);
    };

    const handleEditObjection = (objection: Objection) => {
        setEditingObjection(objection);
        setShowAddModal(true);
    };

    const handleObjectionSaved = () => {
        fetchObjectionsData();
        showToast({ message: 'Objection saved successfully', variant: 'success' });
    };

    const handleArchiveClick = (objection: Objection) => {
        setArchiveTarget(objection);
        setShowArchiveModal(true);
    };

    const handleArchiveConfirm = async () => {
        if (!archiveTarget?.objectionId || !user) return;
        try {
            const result = await bibleService.archiveObjection(
                user,
                archiveTarget.objectionId
            );
            if (result === 'success') {
                showToast({ message: 'Objection archived', variant: 'success' });
                setAllObjections((prev) =>
                    prev.map((o) =>
                        o.objectionId === archiveTarget.objectionId
                            ? { ...o, archiveFl: 'Y' }
                            : o
                    )
                );
            } else {
                showToast({ message: 'Failed to archive objection', variant: 'error' });
            }
        } catch (error) {
            console.error('Error archiving objection:', error);
            showToast({ message: 'Error archiving objection', variant: 'error' });
        }
        setShowArchiveModal(false);
        setArchiveTarget(null);
    };

    const handleAddCategory = async () => {
        if (!newCategoryName.trim() || !user) return;
        setIsAddingCategory(true);
        try {
            const result = await bibleService.addObjectionCategory(
                user,
                newCategoryName.trim(),
                currentCategoryId
            );
            if (result !== -1) {
                showToast({ message: 'Category added', variant: 'success' });
                setNewCategoryName('');
                setShowAddCategoryModal(false);
                fetchObjectionsData();
            } else {
                showToast({ message: 'Failed to add category', variant: 'error' });
            }
        } catch (error) {
            console.error('Error adding category:', error);
            showToast({ message: 'Error adding category', variant: 'error' });
        } finally {
            setIsAddingCategory(false);
        }
    };

    const getAnswerTypeLabel = (cd: string): string => {
        const found = ANSWER_TYPE_LABELS.find((t) => t.value === (cd as AnswerType));
        return found ? found.label : cd;
    };

    if (isLoading) {
        return (
            <Container className="py-4 text-center text-white">
                <Spinner animation="border" role="status" />
                <p className="mt-2">Loading objections...</p>
            </Container>
        );
    }

    return (
        <>
            <Container className="py-4">
                {/* Header with title and actions */}
                <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                    <h1 className="text-white mb-0">Objections</h1>
                    <div className="d-flex gap-2">
                        <Button
                            variant="outline-info"
                            onClick={() => navigate('/practiceObjections')}
                            title="Practice answering objections"
                        >
                            <FontAwesomeIcon icon={faGraduationCap} className="me-2" />
                            Practice
                        </Button>
                        <OverlayTrigger
                            placement="bottom"
                            delay={{ show: 250, hide: 400 }}
                            overlay={
                                categories.length === 0 ? (
                                    <Tooltip id="add-objection-tooltip">
                                        Create at least one category before adding an objection
                                    </Tooltip>
                                ) : (
                                    <></>
                                )
                            }
                        >
                            <span className="d-inline-block">
                                <Button
                                    variant="primary"
                                    onClick={handleAddObjection}
                                    disabled={categories.length === 0}
                                >
                                    <FontAwesomeIcon icon={faPlus} className="me-2" />
                                    Add Objection
                                </Button>
                            </span>
                        </OverlayTrigger>
                    </div>
                </div>

                {/* Search bar */}
                <InputGroup className="mb-3">
                    <InputGroup.Text className="bg-dark text-white border-secondary">
                        <FontAwesomeIcon icon={faSearch} />
                    </InputGroup.Text>
                    <Form.Control
                        type="text"
                        placeholder="Search objections and answers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-dark text-white border-secondary"
                    />
                    {searchTerm && (
                        <Button
                            variant="outline-secondary"
                            onClick={() => setSearchTerm('')}
                        >
                            <FontAwesomeIcon icon={faTimes} />
                        </Button>
                    )}
                </InputGroup>

                {/* Search results take over the display when searching */}
                {searchTerm.trim() ? (
                    <div>
                        <p className="text-white-50 mb-3">
                            Showing {searchResults.length} matching objection
                            {searchResults.length !== 1 ? 's' : ''}
                        </p>
                        {searchResults.length === 0 ? (
                            <p className="text-white-50">No matches found.</p>
                        ) : (
                            <div className="row g-3">
                                {searchResults.map((obj) => (
                                    <div key={obj.objectionId} className="col-12">
                                        <Card bg="dark" text="white">
                                            <Card.Header className="d-flex justify-content-between align-items-start">
                                                <div>
                                                    <Badge bg="info" pill className="me-2">
                                                        {obj.categoryName}
                                                    </Badge>
                                                    <span className="text-white">
                                                        {obj.objectionText}
                                                    </span>
                                                </div>
                                                <div className="d-flex gap-1">
                                                    <Button
                                                        variant="outline-light"
                                                        size="sm"
                                                        onClick={() => handleEditObjection(obj)}
                                                    >
                                                        <FontAwesomeIcon icon={faPencilAlt} />
                                                    </Button>
                                                    <Button
                                                        variant="outline-danger"
                                                        size="sm"
                                                        onClick={() => handleArchiveClick(obj)}
                                                    >
                                                        <FontAwesomeIcon icon={faArchive} />
                                                    </Button>
                                                </div>
                                            </Card.Header>
                                            {obj.answers && obj.answers.length > 0 && (
                                                <Card.Body>
                                                    {obj.answers.map((ans, i) => (
                                                        <div key={i} className="mb-2">
                                                            <Badge bg="secondary" className="me-2">
                                                                {getAnswerTypeLabel(ans.answerTypeCd)}
                                                            </Badge>
                                                            <span className="text-white-50">
                                                                {ans.answerText}
                                                            </span>
                                                            {ans.sourceText && (
                                                                <div className="text-white-50 fst-italic small mt-1">
                                                                    Source: {ans.sourceText}
                                                                    {ans.sourceUrl && (
                                                                        <a
                                                                            href={ans.sourceUrl}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="ms-2"
                                                                        >
                                                                            link
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </Card.Body>
                                            )}
                                        </Card>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Breadcrumb navigation */}
                        {breadcrumb.length > 0 && (
                            <div className="d-flex align-items-center mb-3 flex-wrap gap-2">
                                <Button
                                    variant="outline-light"
                                    size="sm"
                                    onClick={handleBack}
                                >
                                    <FontAwesomeIcon icon={faArrowLeft} className="me-1" />
                                    Back
                                </Button>
                                <div className="d-flex align-items-center flex-wrap gap-1">
                                    <span
                                        className="text-info"
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => handleBreadcrumbClick(-1)}
                                    >
                                        All Categories
                                    </span>
                                    {breadcrumb.map((cat, i) => (
                                        <span key={cat.categoryId} className="d-flex align-items-center">
                                            <FontAwesomeIcon
                                                icon={faChevronRight}
                                                className="text-white-50 mx-1"
                                                size="sm"
                                            />
                                            <span
                                                className={
                                                    i === breadcrumb.length - 1
                                                        ? 'text-white'
                                                        : 'text-info'
                                                }
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => handleBreadcrumbClick(i)}
                                            >
                                                {cat.categoryName}
                                            </span>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Subcategories */}
                        {childCategories.length > 0 && (
                            <div className="mb-4">
                                <h5 className="text-white-50 mb-2">
                                    {breadcrumb.length === 0 ? 'Categories' : 'Subcategories'}
                                </h5>
                                <div className="row g-3">
                                    {childCategories.map((cat) => (
                                        <div
                                            key={cat.categoryId}
                                            className="col-12 col-md-6 col-lg-4"
                                        >
                                            <Card
                                                bg="dark"
                                                text="white"
                                                className="h-100"
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => handleCategoryClick(cat)}
                                            >
                                                <Card.Body className="d-flex align-items-center justify-content-between">
                                                    <div className="d-flex align-items-center">
                                                        <FontAwesomeIcon
                                                            icon={faFolder}
                                                            className="text-warning me-3"
                                                            size="lg"
                                                        />
                                                        <div>
                                                            <div className="text-white">
                                                                {cat.categoryName}
                                                            </div>
                                                            <small className="text-white-50">
                                                                {cat.childCategoryCount > 0 &&
                                                                    `${cat.childCategoryCount} subcategor${cat.childCategoryCount === 1 ? 'y' : 'ies'}`}
                                                                {cat.childCategoryCount > 0 &&
                                                                    cat.objectionCount > 0 &&
                                                                    ' · '}
                                                                {cat.objectionCount > 0 &&
                                                                    `${cat.objectionCount} objection${cat.objectionCount === 1 ? '' : 's'}`}
                                                                {cat.childCategoryCount === 0 &&
                                                                    cat.objectionCount === 0 &&
                                                                    'Empty'}
                                                            </small>
                                                        </div>
                                                    </div>
                                                    <FontAwesomeIcon
                                                        icon={faChevronRight}
                                                        className="text-white-50"
                                                    />
                                                </Card.Body>
                                            </Card>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-2">
                                    <Button
                                        variant="outline-secondary"
                                        size="sm"
                                        onClick={() => {
                                            setNewCategoryName('');
                                            setShowAddCategoryModal(true);
                                        }}
                                    >
                                        <FontAwesomeIcon icon={faPlus} className="me-1" />
                                        Add {breadcrumb.length === 0 ? 'Category' : 'Subcategory'}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* No subcategories — show "Add" button for creating first subcategory */}
                        {childCategories.length === 0 && (
                            <div className="mb-3">
                                <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    onClick={() => {
                                        setNewCategoryName('');
                                        setShowAddCategoryModal(true);
                                    }}
                                >
                                    <FontAwesomeIcon icon={faPlus} className="me-1" />
                                    Add {breadcrumb.length === 0 ? 'Category' : 'Subcategory'}
                                </Button>
                            </div>
                        )}

                        {/* Objections in current category */}
                        <div>
                            <h5 className="text-white-50 mb-2">
                                Objections
                                {objectionsInCurrentCategory.length > 0 &&
                                    ` (${objectionsInCurrentCategory.length})`}
                            </h5>
                            {objectionsInCurrentCategory.length === 0 ? (
                                <p className="text-white-50">
                                    No objections in this category yet.
                                    {categories.length === 0
                                        ? ' Create a category first, then add an objection.'
                                        : ' Click "Add Objection" to create one.'}
                                </p>
                            ) : (
                                <div className="row g-3">
                                    {objectionsInCurrentCategory.map((obj) => (
                                        <div key={obj.objectionId} className="col-12">
                                            <Card bg="dark" text="white">
                                                <Card.Header className="d-flex justify-content-between align-items-start">
                                                    <div className="d-flex align-items-start">
                                                        <FontAwesomeIcon
                                                            icon={faCommentDots}
                                                            className="text-info me-3 mt-1"
                                                            size="lg"
                                                        />
                                                        <span className="text-white">
                                                            {obj.objectionText}
                                                        </span>
                                                    </div>
                                                    <div className="d-flex gap-1 flex-shrink-0">
                                                        <Button
                                                            variant="outline-light"
                                                            size="sm"
                                                            onClick={() => handleEditObjection(obj)}
                                                        >
                                                            <FontAwesomeIcon icon={faPencilAlt} />
                                                        </Button>
                                                        <Button
                                                            variant="outline-danger"
                                                            size="sm"
                                                            onClick={() => handleArchiveClick(obj)}
                                                        >
                                                            <FontAwesomeIcon icon={faArchive} />
                                                        </Button>
                                                    </div>
                                                </Card.Header>
                                                {obj.answers && obj.answers.length > 0 && (
                                                    <Card.Body>
                                                        {obj.answers.map((ans, i) => (
                                                            <div key={i} className="mb-2">
                                                                <Badge bg="secondary" className="me-2">
                                                                    {getAnswerTypeLabel(ans.answerTypeCd)}
                                                                </Badge>
                                                                <span className="text-white-50">
                                                                    {ans.answerText}
                                                                </span>
                                                                {(ans.sourceText || ans.sourceUrl) && (
                                                                    <div className="text-white-50 fst-italic small mt-1">
                                                                        {ans.sourceText && `Source: ${ans.sourceText}`}
                                                                        {ans.sourceText && ans.sourceUrl && ' '}
                                                                        {ans.sourceUrl && (
                                                                            <a
                                                                                href={ans.sourceUrl}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                            >
                                                                                link
                                                                            </a>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </Card.Body>
                                                )}
                                            </Card>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </Container>

            {/* Add/Edit Objection Modal */}
            <AddEditObjectionModal
                show={showAddModal}
                onHide={() => setShowAddModal(false)}
                objection={editingObjection}
                categories={categories}
                currentCategoryId={currentCategoryId}
                onSaved={handleObjectionSaved}
            />

            {/* Add Category Modal */}
            <Modal
                show={showAddCategoryModal}
                onHide={() => !isAddingCategory && setShowAddCategoryModal(false)}
                centered
            >
                <Modal.Header closeButton className="bg-dark text-white">
                    <Modal.Title>
                        Add {breadcrumb.length === 0 ? 'Category' : 'Subcategory'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="bg-dark text-white">
                    <Form>
                        <Form.Group>
                            <Form.Label>Name</Form.Label>
                            <Form.Control
                                type="text"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                placeholder="e.g. Science, Cosmology, Mormonism..."
                                className="bg-dark text-white"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddCategory();
                                    }
                                }}
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer className="bg-dark text-white">
                    <Button
                        variant="secondary"
                        onClick={() => setShowAddCategoryModal(false)}
                        disabled={isAddingCategory}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleAddCategory}
                        disabled={!newCategoryName.trim() || isAddingCategory}
                    >
                        {isAddingCategory ? (
                            <>
                                <Spinner
                                    as="span"
                                    animation="border"
                                    size="sm"
                                    className="me-2"
                                />
                                Adding...
                            </>
                        ) : (
                            'Add'
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Archive Confirmation Modal */}
            <Modal
                show={showArchiveModal}
                onHide={() => setShowArchiveModal(false)}
                centered
            >
                <Modal.Header closeButton className="bg-dark text-white">
                    <Modal.Title>Archive Objection</Modal.Title>
                </Modal.Header>
                <Modal.Body className="bg-dark text-white">
                    Are you sure you want to archive this objection?
                    <div className="mt-2 p-2 border border-secondary rounded">
                        {archiveTarget?.objectionText}
                    </div>
                </Modal.Body>
                <Modal.Footer className="bg-dark text-white">
                    <Button
                        variant="secondary"
                        onClick={() => setShowArchiveModal(false)}
                    >
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={handleArchiveConfirm}>
                        Archive
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Toast */}
            <Toast {...toastProps}>
                <Toast.Body>{toastMessage}</Toast.Body>
            </Toast>
        </>
    );
};

export default Objections;
