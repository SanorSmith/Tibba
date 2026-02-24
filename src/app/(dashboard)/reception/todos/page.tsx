'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Circle, 
  Clock, 
  AlertCircle,
  Trash2,
  Edit,
  X,
  Filter,
  List
} from 'lucide-react';

interface Todo {
  todoid: string;
  workspaceid: string;
  userid: string;
  title: string;
  description: string | null;
  completed: boolean;
  priority: string;
  duedate: string | null;
  createdat: string;
  updatedat: string;
}

export default function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filteredTodos, setFilteredTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    completed: false as boolean,
    duedate: ''
  });

  useEffect(() => {
    loadTodos();
  }, []);

  useEffect(() => {
    filterTodos();
  }, [statusFilter, priorityFilter, todos]);

  const loadTodos = async () => {
    try {
      setLoading(true);
      // Use a proper UUID for the current receptionist user
      const userid = '00000000-0000-0000-0000-000000000001';
      const response = await fetch(`/api/todos?userid=${userid}`);
      if (response.ok) {
        const data = await response.json();
        setTodos(data.todos || []);
        setFilteredTodos(data.todos || []);
      } else {
        console.error('Failed to load todos');
      }
    } catch (error) {
      console.error('Error loading todos:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTodos = () => {
    let filtered = [...todos];

    if (statusFilter !== 'all') {
      if (statusFilter === 'completed') {
        filtered = filtered.filter(t => t.completed === true);
      } else if (statusFilter === 'pending') {
        filtered = filtered.filter(t => t.completed === false);
      }
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(t => t.priority === priorityFilter);
    }

    setFilteredTodos(filtered);
  };

  const handleAddTodo = async () => {
    if (!formData.title.trim()) return;

    try {
      // Use a proper UUID for the current receptionist user
      const userid = '00000000-0000-0000-0000-000000000001';
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          userid
        })
      });

      if (response.ok) {
        await loadTodos();
        setShowAddModal(false);
        resetForm();
      } else {
        const errorData = await response.json();
        console.error('Error adding todo:', errorData);
        alert(errorData.details || 'Failed to add todo. Please try again.');
      }
    } catch (error) {
      console.error('Error adding todo:', error);
      alert('Failed to add todo. Please check your connection and try again.');
    }
  };

  const handleUpdateTodo = async () => {
    if (!selectedTodo || !formData.title.trim()) return;

    try {
      // Use a proper UUID for the current receptionist user
      const userid = '00000000-0000-0000-0000-000000000001';
      const response = await fetch('/api/todos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          todoid: selectedTodo.todoid,
          userid,
          ...formData
        })
      });

      if (response.ok) {
        await loadTodos();
        setShowEditModal(false);
        setSelectedTodo(null);
        resetForm();
      }
    } catch (error) {
      console.error('Error updating todo:', error);
    }
  };

  const handleDeleteTodo = async (todoid: string) => {
    if (!confirm('Are you sure you want to delete this todo?')) return;

    try {
      const response = await fetch(`/api/todos?todoid=${todoid}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadTodos();
      }
    } catch (error) {
      console.error('Error deleting todo:', error);
    }
  };

  const handleToggleStatus = async (todo: Todo) => {
    const newCompleted = !todo.completed;
    
    try {
      // Use a proper UUID for the current receptionist user
      const userid = '00000000-0000-0000-0000-000000000001';
      const response = await fetch('/api/todos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          todoid: todo.todoid,
          userid,
          title: todo.title,
          description: todo.description,
          completed: newCompleted,
          priority: todo.priority,
          duedate: todo.duedate
        })
      });

      if (response.ok) {
        await loadTodos();
      }
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  const openEditModal = (todo: Todo) => {
    setSelectedTodo(todo);
    setFormData({
      title: todo.title,
      description: todo.description || '',
      priority: todo.priority as 'low' | 'medium' | 'high',
      completed: todo.completed,
      duedate: todo.duedate ? new Date(todo.duedate).toISOString().slice(0, 16) : ''
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      completed: false,
      duedate: ''
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (completed: boolean) => {
    if (completed) {
      return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    }
    return <Circle className="w-5 h-5 text-gray-400" />;
  };

  // Calendar functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek };
  };

  const getTodosForDate = (date: Date) => {
    return filteredTodos.filter(todo => {
      if (!todo.duedate) return false;
      const todoDate = new Date(todo.duedate);
      return todoDate.toDateString() === date.toDateString();
    });
  };

  const renderCalendar = () => {
    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);
    const days = [];
    const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 bg-gray-50"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const todosForDay = getTodosForDate(date);
      const isToday = date.toDateString() === new Date().toDateString();

      days.push(
        <div
          key={day}
          className={`h-24 border border-gray-200 p-2 ${isToday ? 'bg-blue-50 border-blue-300' : 'bg-white'}`}
        >
          <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
            {day}
          </div>
          <div className="space-y-1">
            {todosForDay.slice(0, 2).map(todo => (
              <div
                key={todo.todoid}
                className={`text-xs px-1 py-0.5 rounded truncate ${getPriorityColor(todo.priority)}`}
                title={todo.title}
              >
                {todo.title}
              </div>
            ))}
            {todosForDay.length > 2 && (
              <div className="text-xs text-gray-500">+{todosForDay.length - 2} more</div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">{monthName}</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentMonth(new Date())}
              className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Today
            </button>
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="bg-gray-100 p-2 text-center text-sm font-medium text-gray-700">
              {day}
            </div>
          ))}
          {days}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Todo List</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your tasks and stay organized
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add New Todo
        </button>
      </div>

      {/* View Toggle and Filters */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'list'
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <List className="w-5 h-5" />
            List View
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'calendar'
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <CalendarIcon className="w-5 h-5" />
            Calendar View
          </button>
        </div>

        <div className="flex gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Tasks</p>
              <p className="text-2xl font-bold text-gray-900">{todos.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <List className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-gray-900">
                {todos.filter(t => !t.completed).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Circle className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-2xl font-bold text-gray-900">
                {todos.filter(t => t.completed).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Overdue</p>
              <p className="text-2xl font-bold text-gray-900">
                {todos.filter(t => {
                  if (!t.duedate) return false;
                  return new Date(t.duedate) < new Date() && !t.completed;
                }).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading todos...</p>
          </div>
        </div>
      ) : viewMode === 'calendar' ? (
        renderCalendar()
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700 w-12"></th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Task</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Priority</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Due Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTodos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle className="w-12 h-12 text-gray-300" />
                        <p className="text-gray-500">No todos found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTodos.map((todo) => (
                    <tr key={todo.todoid} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleStatus(todo)}
                          className="hover:scale-110 transition-transform"
                        >
                          {getStatusIcon(todo.completed)}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <div className={`font-medium text-sm ${todo.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                            {todo.title}
                          </div>
                          {todo.description && (
                            <div className="text-xs text-gray-500 mt-1">
                              {todo.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(todo.priority)}`}>
                          {todo.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-700">
                          {todo.completed ? 'Completed' : 'Pending'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {todo.duedate ? (
                          <div className="text-sm text-gray-700">
                            {new Date(todo.duedate).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditModal(todo)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTodo(todo.todoid)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Todo Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Add New Todo
                </h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-4">Create a new task for your todo list</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Call patient about lab results"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Details (optional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Add clinical context, patient ID, or priority notes"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date (optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.duedate}
                    onChange={(e) => setFormData({ ...formData, duedate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddTodo}
                  disabled={!formData.title.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Add Todo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Todo Modal */}
      {showEditModal && selectedTodo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Edit className="w-5 h-5" />
                  Edit Todo
                </h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedTodo(null);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Details
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.duedate}
                    onChange={(e) => setFormData({ ...formData, duedate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedTodo(null);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateTodo}
                  disabled={!formData.title.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Update Todo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
