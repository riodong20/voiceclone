import { useState, useEffect, useCallback } from 'react';
import type { TimelineProject, VoiceProfile } from './types';
import { TimelineView } from './components/TimelineView/TimelineView';
import { timelineApi, voiceApi } from './services/api';
import styles from './App.module.css';

function App() {
  const [projects, setProjects] = useState<TimelineProject[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [voices, setVoices] = useState<VoiceProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [projectsData, voicesData] = await Promise.all([
          timelineApi.listProjects(),
          voiceApi.listCloned().catch(() => []), // Don't fail if voices can't load
        ]);
        setProjects(projectsData);
        setVoices(voicesData);
        if (projectsData.length > 0) {
          // Load full project details with segments for the first project
          const fullProject = await timelineApi.getProject(projectsData[0].id);
          setProjects(prev =>
            prev.map(p => p.id === fullProject.id ? fullProject : p)
          );
          setCurrentProjectId(projectsData[0].id);
        }
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('Failed to load projects. Please try refreshing.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Handle project creation
  const handleCreateProject = async () => {
    const name = prompt('Enter project name:');
    if (!name) return;

    try {
      const newProject = await timelineApi.createProject(name);
      setProjects((prev) => [newProject, ...prev]);
      setCurrentProjectId(newProject.id);
    } catch (err) {
      console.error('Failed to create project:', err);
      alert('Failed to create project. Please try again.');
    }
  };

  // Handle project update (from child components)
  const handleProjectUpdate = useCallback((updatedProject: TimelineProject) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === updatedProject.id ? updatedProject : p))
    );
  }, []);

  // Handle voices updated (from child components)
  const handleVoicesUpdated = useCallback(async () => {
    try {
      const voicesData = await voiceApi.listCloned();
      setVoices(voicesData);
    } catch (error) {
      console.error('Failed to refresh voices:', error);
    }
  }, []);

  // Load full project details when switching projects
  useEffect(() => {
    if (!currentProjectId) return;

    const fetchFullProject = async () => {
      try {
        const fullProject = await timelineApi.getProject(currentProjectId);
        setProjects(prev =>
          prev.map(p => p.id === fullProject.id ? fullProject : p)
        );
      } catch (err) {
        console.error('Failed to load project:', err);
      }
    };

    fetchFullProject();
  }, [currentProjectId]);

  const currentProject = projects.find((p) => p.id === currentProjectId);

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>⚠️</div>
        <div className={styles.emptyTitle}>Error</div>
        <div className={styles.emptyHint}>{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.app}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <span>🎙️</span>
          <span>Voice Clone Studio</span>
        </div>

        <div className={styles.headerActions}>
          {projects.length > 0 && (
            <div className={styles.projectSelector}>
              <select
                className={styles.projectSelect}
                value={currentProjectId || ''}
                onChange={(e) => setCurrentProjectId(e.target.value)}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            className={styles.newProjectButton}
            onClick={handleCreateProject}
          >
            + New Project
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        {currentProject ? (
          <TimelineView
            project={currentProject}
            voices={voices}
            onProjectUpdate={handleProjectUpdate}
            onVoicesUpdated={handleVoicesUpdated}
          />
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🎬</div>
            <div className={styles.emptyTitle}>
              No projects yet
            </div>
            <div className={styles.emptyHint}>
              Create a new project to start editing video with voice cloning
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;