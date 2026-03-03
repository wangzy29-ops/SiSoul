import { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { remindersApi } from '../../api';
import Modal from '../../components/Modal';

export default function Reminder() {
    const [reminders, setReminders] = useState([]);
    const [selected, setSelected] = useState(null);
    const [addOpen, setAddOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [remindAt, setRemindAt] = useState('');

    const loadReminders = () => {
        remindersApi.list()
            .then(d => setReminders(Array.isArray(d) ? d : []))
            .catch(() => setReminders([]));
    };

    useEffect(() => { loadReminders(); }, []);

    const events = reminders.map(r => ({
        id: String(r.id),
        title: r.title,
        start: r.remind_at,
        backgroundColor: '#EA4335',
        borderColor: '#EA4335',
        extendedProps: r,
    }));

    const handleAdd = async () => {
        if (!title.trim() || !remindAt) { alert('标题和时间不能为空'); return; }
        try {
            await remindersApi.create({ title: title.trim(), content: content.trim(), remind_at: remindAt });
            setTitle(''); setContent(''); setRemindAt('');
            setAddOpen(false);
            loadReminders();
        } catch (e) {
            alert('添加失败: ' + e.message);
        }
    };

    return (
        <div className="page-enter">
            <div className="toolbar">
                <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>🔔 主动提醒</h2>
                <div className="toolbar-right">
                    <button className="btn btn-primary" onClick={() => { setAddOpen(true); setRemindAt(new Date(Date.now() + 3600000).toISOString().slice(0, 16)); }}>
                        <svg viewBox="0 0 24 24" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        新建提醒
                    </button>
                </div>
            </div>

            <div className="card" style={{ padding: 20, marginBottom: 24 }}>
                <FullCalendar
                    plugins={[dayGridPlugin, interactionPlugin]}
                    initialView="dayGridMonth"
                    events={events}
                    headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth' }}
                    locale="zh-cn"
                    dateClick={(info) => {
                        const dayReminders = reminders.filter(r => r.remind_at?.startsWith(info.dateStr));
                        if (dayReminders.length > 0) setSelected(dayReminders);
                    }}
                    eventClick={(info) => setSelected([info.event.extendedProps])}
                    height="auto"
                />
            </div>

            {selected && (
                <div className="card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                        <h3 style={{ fontWeight: 600 }}>待办任务</h3>
                        <button className="btn btn-outline" onClick={() => setSelected(null)}>关闭</button>
                    </div>
                    {selected.map((r, i) => (
                        <div key={i} className="list-item" style={{ cursor: 'default' }}>
                            <div className="list-item-icon" style={{ background: '#fce8e6', color: '#EA4335' }}>🔔</div>
                            <div className="list-item-content">
                                <div className="list-item-title">{r.title}</div>
                                <div className="list-item-desc">{r.content || '(无详情)'}</div>
                            </div>
                            <div className="list-item-meta">{new Date(r.remind_at).toLocaleString('zh-CN')}</div>
                        </div>
                    ))}
                </div>
            )}

            <Modal open={addOpen} title="新建提醒" onClose={() => setAddOpen(false)} footer={
                <>
                    <button className="btn btn-outline" onClick={() => setAddOpen(false)}>取消</button>
                    <button className="btn btn-primary" onClick={handleAdd}>保存</button>
                </>
            }>
                <div className="form-group">
                    <label className="form-label">标题</label>
                    <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="提醒标题" />
                </div>
                <div className="form-group">
                    <label className="form-label">时间</label>
                    <input className="form-input" type="datetime-local" value={remindAt} onChange={e => setRemindAt(e.target.value)} />
                </div>
                <div className="form-group">
                    <label className="form-label">详情</label>
                    <textarea className="form-textarea" value={content} onChange={e => setContent(e.target.value)} placeholder="详细内容（可选）" />
                </div>
            </Modal>
        </div>
    );
}
