// MEMORY PASSAGES flow — configuration screen for choosing practice mode (by reference or by text) and display order before starting practice.
import { Container, Form, Button, Spinner, Alert, Card } from 'react-bootstrap';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBookOpen, faSearch, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import {
  BY_REF,
  BY_PSG_TXT,
  BY_FREQ,
  INTERLEAVE,
  RAND,
  BY_LAST_PRACTICED
} from '../models/passage-utils';
import { offlineCache } from '../services/offline-cache';
import { useAppSelector } from '../store/hooks';
import { GUEST_USER } from '../models/constants';
import { bibleService } from '../services/bible-service';

const PracticeSetup = () => {
  const [practiceMode, setPracticeMode] = useState(BY_REF);
  const [displayOrder, setDisplayOrder] = useState(BY_FREQ);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<{ count: number } | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [hasCache, setHasCache] = useState(false);
  const [cacheMeta, setCacheMeta] = useState<{ user: string; downloadedAt: string; count: number } | null>(null);
  const [queuedCount, setQueuedCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [passageCount, setPassageCount] = useState<number | null>(null);
  const navigate = useNavigate();

  const user = useAppSelector((state) => state.user.currentUser);
  const isGuestUser = user === GUEST_USER;

  useEffect(() => {
    const fetchPassageCount = async () => {
      try {
        const passages = await bibleService.getMemoryPassageList(user);
        setPassageCount(passages.length);
      } catch (error) {
        console.error('Error fetching memory passage count:', error);
        setPassageCount(0);
      }
    };
    if (user) {
      fetchPassageCount();
    }
  }, [user]);

  const checkCache = async () => {
    const exists = await offlineCache.hasCache();
    setHasCache(exists);
    if (exists) {
      const meta = await offlineCache.getMetadata();
      setCacheMeta(meta || null);
    } else {
      setCacheMeta(null);
    }
    const queued = await offlineCache.getQueuedCount();
    setQueuedCount(queued);
  };

  useEffect(() => {
    checkCache();
  }, []);

  const handleStart = () => {
    navigate(`/practice/${practiceMode}/${displayOrder}`);
  };

  const handleStartOffline = () => {
    navigate(`/practiceOffline/${practiceMode}/${displayOrder}`);
  };

  const handleDownload = async () => {
    if (!user || isGuestUser) return;
    setIsDownloading(true);
    setDownloadError(null);
    setDownloadStatus(null);
    try {
      const result = await offlineCache.downloadPassages(user);
      setDownloadStatus(result);
      await checkCache();
    } catch (error) {
      console.error('Error downloading passages:', error);
      setDownloadError('Failed to download passages. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSyncLastViewed = async () => {
    if (!user || isGuestUser) return;
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const result = await offlineCache.syncLastViewedQueue(user);
      setSyncResult(`Synced ${result.synced} update(s)${result.failed > 0 ? `, ${result.failed} failed` : ''}`);
      await checkCache();
    } catch (error) {
      console.error('Error syncing last-viewed:', error);
      setSyncResult('Error syncing last-viewed updates');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearCache = async () => {
    await offlineCache.clearCache();
    await checkCache();
  };

  return (
      <Container className="p-4">
        <h1 className="text-white mb-4">Practice Setup</h1>

        {passageCount === 0 && (
            <Alert variant="info" className="mb-4">
              <Alert.Heading>No Memory Passages Yet</Alert.Heading>
              <p className="mb-3">
                To practice memorizing Bible passages, you first need to add some
                memory passages. There are two easy ways to do this:
              </p>
              <Card className="bg-dark text-white border-secondary mb-3">
                <Card.Body>
                  <div className="d-flex align-items-start">
                    <FontAwesomeIcon
                        icon={faSearch}
                        className="me-3 mt-1 text-warning"
                        size="lg"
                    />
                    <div>
                      <h6 className="mb-1">Option 1: Add Memory Passage</h6>
                      <p className="mb-2 text-white-50">
                        Use the <strong>"Add Memory Passage..."</strong> item in the
                        top menu to search for a specific passage by book, chapter,
                        and verse range.
                      </p>
                    </div>
                  </div>
                </Card.Body>
              </Card>
              <Card className="bg-dark text-white border-secondary mb-3">
                <Card.Body>
                  <div className="d-flex align-items-start">
                    <FontAwesomeIcon
                        icon={faBookOpen}
                        className="me-3 mt-1 text-warning"
                        size="lg"
                    />
                    <div>
                      <h6 className="mb-1">Option 2: Add From a Chapter View</h6>
                      <p className="mb-2 text-white-50">
                        Use the <strong>"View Chapter"</strong> item in the top menu
                        to open the Bible chapter containing your target passage.
                        While reading the chapter, use the toolbar menu to add a
                        single verse or a range of verses to your memory passages.
                      </p>
                    </div>
                  </div>
                </Card.Body>
              </Card>
              <div className="d-flex gap-2 flex-wrap">
                <Button
                    variant="primary"
                    onClick={() => navigate('/viewChapter')}
                >
                  <FontAwesomeIcon icon={faBookOpen} className="me-2" />
                  Go to View Chapter
                  <FontAwesomeIcon icon={faArrowRight} className="ms-2" />
                </Button>
                <Button
                    variant="outline-light"
                    onClick={() => navigate('/memoryPassages')}
                >
                  View My Memory Passages
                </Button>
              </div>
            </Alert>
        )}

        <div className="mb-4">
          <h2 className="text-white mb-3">Practice Mode</h2>
          <Form>
            <div className="bg-dark p-3 rounded">
              <Form.Check
                  type="radio"
                  id="practice-by-ref"
                  label="By Reference"
                  name="practiceMode"
                  className="text-white mb-2"
                  checked={practiceMode === BY_REF}
                  onChange={() => setPracticeMode(BY_REF)}
              />
              <Form.Check
                  type="radio"
                  id="practice-by-text"
                  label="By Passage Text"
                  name="practiceMode"
                  className="text-white"
                  checked={practiceMode === BY_PSG_TXT}
                  onChange={() => setPracticeMode(BY_PSG_TXT)}
              />
            </div>
          </Form>
        </div>

        <div className="mb-4">
          <h2 className="text-white mb-3">Passage Display Order</h2>
          <Form>
            <div className="bg-dark p-3 rounded">
              <Form.Check
                  type="radio"
                  id="order-by-freq"
                  label="By Frequency"
                  name="displayOrder"
                  className="text-white mb-2"
                  checked={displayOrder === BY_FREQ}
                  onChange={() => setDisplayOrder(BY_FREQ)}
              />
              <Form.Check
                  type="radio"
                  id="order-interleave"
                  label="Interleave"
                  name="displayOrder"
                  className="text-white mb-2"
                  checked={displayOrder === INTERLEAVE}
                  onChange={() => setDisplayOrder(INTERLEAVE)}
              />
              <Form.Check
                  type="radio"
                  id="order-random"
                  label="By Random"
                  name="displayOrder"
                  className="text-white mb-2"
                  checked={displayOrder === RAND}
                  onChange={() => setDisplayOrder(RAND)}
              />
              <Form.Check
                  type="radio"
                  id="order-by-last-practiced"
                  label="By Last Practiced Date/Time"
                  name="displayOrder"
                  className="text-white"
                  checked={displayOrder === BY_LAST_PRACTICED}
                  onChange={() => setDisplayOrder(BY_LAST_PRACTICED)}
              />
            </div>
          </Form>
        </div>

        <div className="text-center mb-4">
          <Button
              variant="primary"
              size="lg"
              onClick={handleStart}
          >
            Start
          </Button>
        </div>

        {!isGuestUser && (
            <div className="mb-4">
              <h2 className="text-white mb-3">Offline Practice</h2>
              <div className="bg-dark p-3 rounded">
                {cacheMeta && (
                    <div className="text-white-50 mb-2">
                      <small>
                        Cached: {cacheMeta.count} passages on{' '}
                        {new Date(cacheMeta.downloadedAt).toLocaleString()}
                      </small>
                    </div>
                )}

                {downloadStatus && (
                    <Alert variant="success" className="mb-2">
                      Downloaded {downloadStatus.count} passages for offline use.
                    </Alert>
                )}

                {downloadError && (
                    <Alert variant="danger" className="mb-2">
                      {downloadError}
                    </Alert>
                )}

                {syncResult && (
                    <Alert variant="info" className="mb-2">
                      {syncResult}
                    </Alert>
                )}

                <div className="d-flex flex-wrap gap-2 mt-2">
                  <Button
                      variant="outline-light"
                      onClick={handleDownload}
                      disabled={isDownloading}
                  >
                    {isDownloading ? (
                        <>
                          <Spinner as="span" animation="border" size="sm" className="me-2" />
                          Downloading...
                        </>
                    ) : (
                        'Download for Offline'
                    )}
                  </Button>

                  {hasCache && (
                      <Button
                          variant="outline-light"
                          onClick={handleStartOffline}
                      >
                        Practice Offline
                      </Button>
                  )}

                  {hasCache && (
                      <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={handleClearCache}
                      >
                        Clear Cache
                      </Button>
                  )}

                  {queuedCount > 0 && (
                      <Button
                          variant="outline-warning"
                          onClick={handleSyncLastViewed}
                          disabled={isSyncing}
                      >
                        {isSyncing ? (
                            <>
                              <Spinner as="span" animation="border" size="sm" className="me-2" />
                              Syncing...
                            </>
                        ) : (
                            `Sync Last-Viewed (${queuedCount})`
                        )}
                      </Button>
                  )}
                </div>
              </div>
            </div>
        )}
      </Container>
  );
};

export default PracticeSetup;
