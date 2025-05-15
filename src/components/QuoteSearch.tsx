import {useNavigate} from 'react-router-dom';
import {useAppSelector} from '../store/hooks.ts';
import {USER} from '../models/constants.ts';
import {useCallback, useEffect, useRef, useState} from 'react';
import {Quote} from '../models/quote.ts';
import {bibleService} from '../services/bible-service.ts';
import {Button, Col, Form, Row, Spinner} from 'react-bootstrap';
import {AgGridReact} from 'ag-grid-react';
import {CellClickedEvent, GridApi} from 'ag-grid-community';
import {
    faAngleDoubleLeft,
    faAngleDoubleRight,
    faAngleLeft,
    faAngleRight,
} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
    AllCommunityModule,
    ModuleRegistry,
    provideGlobalGridOptions,
} from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import QuoteCellRenderer from '../renderers/QuoteCellRenderer';

// Register all community features
ModuleRegistry.registerModules([AllCommunityModule]);

// Mark all grids as using legacy themes
provideGlobalGridOptions({theme: 'legacy'});

const QuoteSearch = () => {
    const navigate = useNavigate();

    const currentUser = useAppSelector((state) => state.user.currentUser);
    const user = currentUser || USER;
    const [filteredQuotes, setFilteredQuotes] = useState<Quote[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [searchString, setSearchString] = useState('');
    const [paginationInfo, setPaginationInfo] = useState(null);
    const gridApiRef = useRef<GridApi | null>(null);

    useEffect(() => {
        console.log('QuoteSearch.useEffect[user] - entering...');
        const fetchQuotes = async () => {
            console.log('QuoteSearch.useEffect[user] - fetching quotes...');
            try {
                setIsLoading(true);
                // Get quotes with text included for searching
                const quoteList = await bibleService.getQuoteList(user, true);
                console.log(
                    'QuoteSearch.useEffect[user] - quotes received:',
                    quoteList
                );
                setFilteredQuotes(quoteList);
            } catch (error) {
                console.error('Error fetching quotes:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchQuotes();
    }, [user]);

    const onGridReady = useCallback((params) => {
        params.api.resetRowHeights();
        gridApiRef.current = params.api; // assigned gridApi value on Grid ready
    }, []);

    const handleTableFilter = (evt) => {
        setSearchString(evt.target.value);
        if (gridApiRef.current) {
            gridApiRef.current.setFilterModel({
                quoteTx: {
                    type: 'contains',
                    filter: evt.target.value,
                },
            });
            //gridApiRef.current.setQuickFilter(evt.target.value);
        }
    };

    const handleFilterChanged = (ev) => {
        if (ev?.api?.rowModel?.rowsToDisplay) {
            setFilteredQuotes(ev.api.rowModel.rowsToDisplay);
        } else {
            console.log('handleFilterChanged - no rows ');
        }
    };

    const goTo = (quoteId: number) => {
        navigate(`/viewQuotes/${quoteId}`);
    };

    const onPaginationChanged = useCallback((evt) => {
        if (evt?.api) {
            const newPgInfo = {
                currentPage: evt.api.paginationGetCurrentPage() + 1,
                totalPages: evt.api.paginationGetTotalPages(),
                totalRows: evt.api.paginationGetRowCount(),
                isLastPage: evt.api.paginationIsLastPageFound(),
                pageSize: evt.api.paginationGetPageSize(),
            };

            setPaginationInfo((prevPgInfo) => {
                const same = JSON.stringify(prevPgInfo) === JSON.stringify(newPgInfo);
                return same ? prevPgInfo : newPgInfo;
            });
        }
    }, []);

    const onBtFirst = () => {
        if (gridApiRef.current) {
            gridApiRef.current.paginationGoToFirstPage();
        }
    };

    const onBtLast = () => {
        if (gridApiRef.current) {
            gridApiRef.current.paginationGoToLastPage();
        }
    };

    const onBtNext = () => {
        if (gridApiRef.current) {
            gridApiRef.current.paginationGoToNextPage();
        }
    };

    const onBtPrevious = () => {
        if (gridApiRef.current) {
            gridApiRef.current.paginationGoToPreviousPage();
        }
    };

    if (isLoading) {
        return (
            <div className="text-center text-white">
                <Spinner animation="border" role="status"/>
                <p className="mt-2">Loading quotes...</p>
            </div>
        );
    } else {
        return (
            <>
                <Row justify="center">
                    <h1 className="text-white">Search Quotes</h1>
                </Row>
                <Row justify="center" align="middle">
                    <Col style={{marginRight: '5px'}}>
                        <Form.Control
                            autoFocus={true}
                            type="text"
                            placeholder="Enter Search"
                            value={searchString}
                            onChange={handleTableFilter}
                            className="mb-2"
                        />
                    </Col>
                </Row>
                {paginationInfo && paginationInfo.totalRows > 0 && (
                    <Row justify="center">
                        <Col>
                            Pg {paginationInfo.currentPage} of {paginationInfo.totalPages} (
                            {paginationInfo.totalRows} matches)
                        </Col>
                    </Row>
                )}
                <Row justify="center">
                    <Col style={{marginRight: '5px'}}>
                        <Button
                            disabled={
                                !paginationInfo ||
                                paginationInfo.totalRows === 0 ||
                                paginationInfo.currentPage === 1
                            }
                            onClick={onBtFirst}
                        >
                            <FontAwesomeIcon icon={faAngleDoubleLeft} className="me-2"/>
                        </Button>
                    </Col>
                    <Col style={{marginRight: '5px'}}>
                        <Button
                            disabled={
                                !paginationInfo ||
                                paginationInfo.totalRows === 0 ||
                                paginationInfo.currentPage === 1
                            }
                            onClick={onBtPrevious}
                        >
                            <FontAwesomeIcon icon={faAngleLeft} className="me-2"/>
                        </Button>
                    </Col>
                    <Col style={{marginRight: '5px'}}>
                        <Button
                            disabled={
                                !paginationInfo ||
                                paginationInfo.totalRows === 0 ||
                                paginationInfo.currentPage === paginationInfo.totalPages
                            }
                            onClick={onBtNext}
                        >
                            <FontAwesomeIcon icon={faAngleRight} className="me-2"/>
                        </Button>
                    </Col>
                    <Col style={{marginRight: '5px'}}>
                        <Button
                            disabled={
                                !paginationInfo ||
                                paginationInfo.totalRows === 0 ||
                                paginationInfo.currentPage === paginationInfo.totalPages
                            }
                            onClick={onBtLast}
                        >
                            <FontAwesomeIcon icon={faAngleDoubleRight} className="me-2"/>
                        </Button>
                    </Col>
                </Row>
                <div style={{width: '100%', height: '100%'}}>
                    <div
                        id="myGrid"
                        style={{
                            height: '100%',
                            width: '100%',
                            '--ag-background-color': '#212529',
                            '--ag-foreground-color': '#ffffff',
                            '--ag-header-background-color': '#343a40',
                            '--ag-header-foreground-color': '#ffffff',
                            '--ag-odd-row-background-color': '#212529',
                            '--ag-row-hover-color': '#343a40',
                            '--ag-border-color': '#495057',
                        } as React.CSSProperties}
                        className="ag-theme-alpine"
                    >
                        <AgGridReact
                            domLayout="autoHeight"
                            rowData={filteredQuotes}
                            gridOptions={{
                                pagination: true,
                                paginationPageSize: 6,
                                getRowStyle: () => {
                                    return {
                                        borderWidth: 'thick',
                                        color: '#ffffff',
                                        backgroundColor: '#212529'
                                    };
                                },
                                onCellClicked: (event: CellClickedEvent) =>
                                    goTo((event.data as Quote).quoteId),
                            }}
                            onGridReady={onGridReady}
                            onPaginationChanged={onPaginationChanged}
                            defaultColDef={{
                                editable: true,
                                sortable: true,
                                flex: 1,
                                minWidth: 300,
                                filter: true,
                                resizable: true,
                            }}
                            onFilterChanged={handleFilterChanged}
                            suppressPaginationPanel={true}
                            columnDefs={[
                                {
                                    field: 'quoteTx',
                                    wrapText: true,
                                    autoHeight: true,
                                    cellRenderer: QuoteCellRenderer,
                                    cellRendererParams: {searchString: searchString},
                                    headerName: 'Quote Text',
                                },
                            ]}
                        />
                    </div>
                </div>
            </>
        );
    }
};

export default QuoteSearch;