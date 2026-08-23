// MEMORY PASSAGES flow — configuration screen for choosing practice mode (by reference or by text) and display order before starting practice.
import { Container, Form, Button, Spinner, Alert } from 'react-bootstrap';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

const PracticeSetup = () => {
  const [practiceMode, setPracticeMode] = useState(BY_REF);
  const [displayOrder, setDisplayOrder] = useState(BY_FREQ);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<{ count: number } | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<{ current: number; total: number } | null>(null);
  const [hasCache, setHasCache] = useState(false);
  const [cacheMeta, setCacheMeta] = useState<{ user: string; downloadedAt: string; count: number } | null>(null);
  const [queuedCount, setQueuedCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const navigate = useNavigate();

  const user = useAppSelector((state) => state.user.currentUser);
  const isGuestUser = user === GUEST_USER;

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
    setDownloadProgress({ current: 0, total: 0 });
    try {
      const result = await offlineCache.downloadPassages(user, (current, total) => {
        setDownloadProgress({ current, total });
      });
      setDownloadStatus(result);
      await checkCache();
    } catch (error) {
      console.error('Error downloading passages:', error);
      setDownloadError('Failed to download passages. Please try again.');
    } finally {
      setIsDownloading(false);
      setDownloadProgress(null);
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

                {isDownloading && downloadProgress && (
                    <div className="mb-3">
                      <div className="d-flex justify-content-between text-white-50 mb-1">
                        <small>
                          Downloading passages...
                        </small>
                        <small>
                          {downloadProgress.current} of {downloadProgress.total}
                          {downloadProgress.total > 0
                              ? ` (${Math.round((downloadProgress.current / downloadProgress.total) * 100)}%)`
                              : ''}
                        </small>
                      </div>
                      <div className="progress" style={{ height: '20px' }}>
                        <div
                            className="progress-bar progress-bar-striped progress-bar-animated bg-primary"
                            role="progressbar"
                            style={{
                              width: downloadProgress.total > 0
                                  ? `${(downloadProgress.current / downloadProgress.total) * 100}%`
                                  : '0%',
                            }}
                            aria-valuenow={downloadProgress.current}
                            aria-valuemin={0}
                            aria-valuemax={downloadProgress.total || 1}
                        />
                      </div>
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
