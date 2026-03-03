import { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { assistantApi } from '../../api';

export default function Events() {
    const [items, setItems] = useState([]);
    const [selected, setSelected] = useState(null);

    useEffect(() => {
        assistantApi.list('event')
            .then(d => setItems(Array.isArray(d) ? d : []))
            .catch(() => setItems([]));
    }, []);

    const events = items.map(item => ({
        id: String(item.id),
        title: item.title,
        start: item.item_date,
        backgroundColor: '#FBBC05',
        borderColor: '#FBBC05',
        textColor: '#333',
        extendedProps: item,
    }));

    return (
        <div className="page-enter">
            <div className="toolbar">
                <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>⏰ 重要事件</h2>
            </div>

            <div className="card" style={{ padding: 20, marginBottom: 24 }}>
                <FullCalendar
                    plugins={[dayGridPlugin, interactionPlugin]}
                    initialView="dayGridMonth"
                    events={events}
                    headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth' }}
                    locale="zh-cn"
                    dateClick={(info) => {
                        const dayItems = items.filter(i => i.item_date?.startsWith(info.dateStr));
                        if (dayItems.length > 0) setSelected(dayItems);
                    }}
                    eventClick={(info) => setSelected([info.event.extendedProps])}
                    height="auto"
                />
            </div>

            {selected && (
                <div className="card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                        <h3 style={{ fontWeight: 600 }}>事件详情</h3>
                        <button className="btn btn-outline" onClick={() => setSelected(null)}>关闭</button>
                    </div>
                    {selected.map((item, i) => (
                        <div key={i} className="list-item" style={{ cursor: 'default' }}>
                            <div className="list-item-icon" style={{ background: '#fef7e0', color: '#FBBC05' }}>⏰</div>
                            <div className="list-item-content">
                                <div className="list-item-title">{item.title}</div>
                                <div className="list-item-desc">{item.content || '(无详情)'}</div>
                            </div>
                            <div className="list-item-meta">{new Date(item.item_date).toLocaleDateString('zh-CN')}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
