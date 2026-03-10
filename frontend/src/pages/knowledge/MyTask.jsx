import { useState } from 'react';
import Modal from '../../components/Modal';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year, month) {
    return new Date(year, month, 1).getDay();
}

function formatDate(y, m, d) {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export default function MyTask() {
    const today = new Date();
    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth());
    const [tasks, setTasks] = useState({});  // { 'YYYY-MM-DD': [{ id, title, type, done }] }
    const [selectedDate, setSelectedDate] = useState(null);
    const [addOpen, setAddOpen] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newType, setNewType] = useState('todo');  // 'todo' | 'schedule'

    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfWeek(year, month);
    const todayStr = formatDate(today.getFullYear(), today.getMonth(), today.getDate());

    const prevMonth = () => {
        if (month === 0) { setYear(y => y - 1); setMonth(11); }
        else setMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (month === 11) { setYear(y => y + 1); setMonth(0); }
        else setMonth(m => m + 1);
    };

    const goToday = () => {
        setYear(today.getFullYear());
        setMonth(today.getMonth());
    };

    const handleAddTask = () => {
        if (!newTitle.trim() || !selectedDate) return;
        const task = { id: Date.now(), title: newTitle.trim(), type: newType, done: false };
        setTasks(prev => ({
            ...prev,
            [selectedDate]: [...(prev[selectedDate] || []), task],
        }));
        setNewTitle('');
        setAddOpen(false);
    };

    const toggleDone = (dateKey, taskId) => {
        setTasks(prev => ({
            ...prev,
            [dateKey]: (prev[dateKey] || []).map(t => t.id === taskId ? { ...t, done: !t.done } : t),
        }));
    };

    const deleteTask = (dateKey, taskId) => {
        setTasks(prev => ({
            ...prev,
            [dateKey]: (prev[dateKey] || []).filter(t => t.id !== taskId),
        }));
    };

    // Build calendar grid
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    return (
        <div className="page-enter">
            <div className="km-toolbar">
                <div className="km-toolbar-left">
                    <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginLeft: 0 }}>MyTask 任务</h2>
                </div>
            </div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', margin: '0 0 16px 0' }}>
                通过 AI 助理生成计划与任务，在日历中创建日程和待办
            </p>

            {/* Calendar header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: 'var(--font-size-sm)' }} onClick={prevMonth}>◀</button>
                <span style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, minWidth: 140, textAlign: 'center' }}>{year} 年 {month + 1} 月</span>
                <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: 'var(--font-size-sm)' }} onClick={nextMonth}>▶</button>
                <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: 'var(--font-size-sm)', marginLeft: 8 }} onClick={goToday}>今天</button>
            </div>

            {/* Weekday headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
                {WEEKDAYS.map(w => (
                    <div key={w} style={{ textAlign: 'center', padding: 8, fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-muted)' }}>{w}</div>
                ))}
            </div>

            {/* Calendar grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
                {cells.map((day, i) => {
                    if (!day) return <div key={`empty-${i}`} style={{ minHeight: 90, background: 'var(--color-bg-secondary)', borderRadius: 4, opacity: 0.3 }} />;
                    const dateKey = formatDate(year, month, day);
                    const isToday = dateKey === todayStr;
                    const isSelected = dateKey === selectedDate;
                    const dayTasks = tasks[dateKey] || [];

                    return (
                        <div
                            key={dateKey}
                            onClick={() => setSelectedDate(dateKey)}
                            style={{
                                minHeight: 90,
                                padding: 6,
                                background: isSelected ? 'rgba(66,133,244,0.08)' : 'var(--color-bg-secondary)',
                                borderRadius: 6,
                                cursor: 'pointer',
                                border: isSelected ? '2px solid var(--color-primary)' : isToday ? '2px solid #f59e0b' : '2px solid transparent',
                                transition: 'all 0.15s',
                            }}
                        >
                            <div style={{
                                fontSize: 'var(--font-size-xs)',
                                fontWeight: isToday ? 700 : 400,
                                color: isToday ? '#f59e0b' : 'var(--color-text)',
                                marginBottom: 4,
                            }}>
                                {day}
                            </div>
                            {dayTasks.slice(0, 3).map(t => (
                                <div key={t.id} style={{
                                    fontSize: 10,
                                    padding: '1px 4px',
                                    marginBottom: 2,
                                    borderRadius: 3,
                                    background: t.type === 'schedule' ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.15)',
                                    color: t.type === 'schedule' ? '#3b82f6' : '#10b981',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    textDecoration: t.done ? 'line-through' : 'none',
                                    opacity: t.done ? 0.5 : 1,
                                }}>
                                    {t.type === 'schedule' ? '📌' : '☑️'} {t.title}
                                </div>
                            ))}
                            {dayTasks.length > 3 && <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>+{dayTasks.length - 3} 更多</div>}
                        </div>
                    );
                })}
            </div>

            {/* Selected date detail panel */}
            {selectedDate && (
                <div className="card" style={{ marginTop: 16, padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600 }}>📋 {selectedDate}</h3>
                        <button className="btn btn-primary" style={{ borderRadius: 6, fontSize: 'var(--font-size-sm)' }} onClick={() => { setNewTitle(''); setAddOpen(true); }}>
                            + 添加
                        </button>
                    </div>
                    {(tasks[selectedDate] || []).length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 20, color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>暂无日程和待办</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {(tasks[selectedDate] || []).map(t => (
                                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--color-bg-secondary)', borderRadius: 6 }}>
                                    <input type="checkbox" checked={t.done} onChange={() => toggleDone(selectedDate, t.id)} style={{ cursor: 'pointer' }} />
                                    <span style={{
                                        flex: 1,
                                        fontSize: 'var(--font-size-sm)',
                                        textDecoration: t.done ? 'line-through' : 'none',
                                        opacity: t.done ? 0.5 : 1,
                                    }}>
                                        <span style={{
                                            display: 'inline-block',
                                            padding: '1px 6px',
                                            borderRadius: 4,
                                            fontSize: 'var(--font-size-xs)',
                                            marginRight: 8,
                                            background: t.type === 'schedule' ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.15)',
                                            color: t.type === 'schedule' ? '#3b82f6' : '#10b981',
                                        }}>
                                            {t.type === 'schedule' ? '日程' : '待办'}
                                        </span>
                                        {t.title}
                                    </span>
                                    <button className="km-icon-btn" title="删除" onClick={() => deleteTask(selectedDate, t.id)}>
                                        <svg viewBox="0 0 24 24" width="14" height="14" style={{ stroke: 'currentColor', strokeWidth: 1.8, fill: 'none' }}><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Add task modal */}
            <Modal open={addOpen} title={`添加到 ${selectedDate}`} onClose={() => setAddOpen(false)} footer={<><button className="btn btn-outline" onClick={() => setAddOpen(false)}>取消</button><button className="btn btn-primary" onClick={handleAddTask}>添加</button></>}>
                <div className="form-group">
                    <label className="form-label">类型</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className={`btn ${newType === 'todo' ? 'btn-primary' : 'btn-outline'}`} style={{ flex: 1 }} onClick={() => setNewType('todo')}>☑️ 待办</button>
                        <button className={`btn ${newType === 'schedule' ? 'btn-primary' : 'btn-outline'}`} style={{ flex: 1 }} onClick={() => setNewType('schedule')}>📌 日程</button>
                    </div>
                </div>
                <div className="form-group">
                    <label className="form-label">标题</label>
                    <input className="form-input" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="输入任务标题" />
                </div>
            </Modal>
        </div>
    );
}
