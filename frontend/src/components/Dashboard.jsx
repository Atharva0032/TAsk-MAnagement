import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../AuthContext';
import { fetchApi } from '../utils/api';
import { socket } from '../utils/socket';
import TaskCard from './TaskCard';
import { LogOut, Plus } from 'lucide-react';

export default function Dashboard() {
  const { user, logout } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const data = await fetchApi('/tasks');
        setTasks(data);
      } catch (err) {
        console.error('Failed to load tasks', err);
      }
    };
    
    loadTasks();

    if (user) {
      socket.on(`task_added_${user.id}`, (newTask) => {
        setTasks((prev) => [...prev, newTask]);
      });

      socket.on(`task_updated_${user.id}`, (updatedTask) => {
        setTasks((prev) => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
      });

      socket.on(`task_deleted_${user.id}`, (taskId) => {
        setTasks((prev) => prev.filter(t => t.id !== parseInt(taskId)));
      });
    }

    return () => {
      if (user) {
        socket.off(`task_added_${user.id}`);
        socket.off(`task_updated_${user.id}`);
        socket.off(`task_deleted_${user.id}`);
      }
    };
  }, [user]);

  const handleAddTask = async (e) => {
    e.preventDefault();
    setError('');
    if (!title.trim()) return;

    try {
      await fetchApi('/tasks', {
        method: 'POST',
        body: JSON.stringify({ title, description, status: 'pending' })
      });
      setTitle('');
      setDescription('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateTask = async (id, updatedData) => {
    try {
      await fetchApi(`/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updatedData)
      });
    } catch (err) {
      console.error('Failed to update task', err);
    }
  };

  const handleDeleteTask = async (id) => {
    try {
      await fetchApi(`/tasks/${id}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.error('Failed to delete task', err);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Task Manager</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Welcome, {user?.username}</span>
          <button onClick={logout} className="btn btn-danger" style={{ padding: '0.5rem 1rem' }}>
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>

      <div className="new-task-form">
        <h3 style={{ marginBottom: '1rem' }}>Create New Task</h3>
        {error && <div style={{ color: 'var(--danger-color)', marginBottom: '1rem' }}>{error}</div>}
        <form onSubmit={handleAddTask} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            type="text"
            className="input-field"
            placeholder="Task Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <textarea
            className="input-field"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            style={{ resize: 'vertical' }}
          />
          <div style={{ alignSelf: 'flex-start' }}>
            <button type="submit" className="btn btn-primary">
              <Plus size={20} />
              Add Task
            </button>
          </div>
        </form>
      </div>

      <div className="task-grid">
        {tasks.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)', gridColumn: '1 / -1', textAlign: 'center', padding: '2rem' }}>
            No tasks yet. Create one to get started!
          </div>
        ) : (
          tasks.map(task => (
            <TaskCard 
              key={task.id} 
              task={task} 
              onUpdate={handleUpdateTask} 
              onDelete={handleDeleteTask} 
            />
          ))
        )}
      </div>
    </div>
  );
}
