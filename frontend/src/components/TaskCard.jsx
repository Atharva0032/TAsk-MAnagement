import { CheckCircle, Circle, Trash2 } from 'lucide-react';

export default function TaskCard({ task, onUpdate, onDelete }) {
  const isCompleted = task.status === 'completed';

  const toggleStatus = () => {
    onUpdate(task.id, {
      ...task,
      status: isCompleted ? 'pending' : 'completed'
    });
  };

  return (
    <div className={`task-card ${isCompleted ? 'completed' : ''}`}>
      <div className="task-title">{task.title}</div>
      {task.description && <div className="task-desc">{task.description}</div>}
      
      <div 
        style={{ marginBottom: '1rem' }} 
        className={`status-badge ${isCompleted ? 'status-completed' : 'status-pending'}`}
      >
        {task.status}
      </div>

      <div className="task-actions">
        <button 
          className="action-icon complete" 
          onClick={toggleStatus}
          title={isCompleted ? 'Mark as pending' : 'Mark as completed'}
        >
          {isCompleted ? <CheckCircle size={20} /> : <Circle size={20} />}
        </button>
        <button 
          className="action-icon delete" 
          onClick={() => onDelete(task.id)}
          title="Delete task"
        >
          <Trash2 size={20} />
        </button>
      </div>
    </div>
  );
}
