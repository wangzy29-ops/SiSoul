import { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { assistantApi } from '../../api';

export default function Summary() {
    const [items, setItems] = useState([]);
    const [selected, setSelected] = useState(null);
    const [viewRange, setViewRange] = useState('dayGridMonth');
    const calendarRef = useRef();

    useEffect(() => {
        assistantApi.list('summary')
            .then(d => setItems(Array.isArray(d) ? d : []))
            .catch(() => setItems([]));
    }, []);

    const events = items.map(item => ({
        id: String(item.id),
        title: item.title,
        start: item.item_date,
        backgroundColor: '#4285F4',
        borderColor: '#4285F4',
        extendedProps: item,
    }));

    const ranges = [
        { key: 'dayGridMonth', label: '月' },
        { key: 'timeGridWeek', label: '周' },
        { key: 'timeGridDay', label: '日' },
    ];

    return (
        <div className="page-enter">
            <div className="toolbar">
                <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>📅 周期总结</h2>
                <div className="toolbar-right">
                    {ranges.map(r => (
                        <button
                            key={r.key}
                            className={`btn ${viewRange === r.key ? 'btn-secondary' : 'btn-outline'}`}
                            onClick={() => {
                                setViewRange(r.key);
                                calendarRef.current?.getApi()?.changeView(r.key);
                            }}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="card" style={{ padding: 20, marginBottom: 24 }}>
                <FullCalendar
                    ref={calendarRef}
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView={viewRange}
                    events={events}
                    headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: '',
                    }}
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3 style={{ fontWeight: 600 }}>当日总结</h3>
                        <button className="btn btn-outline" onClick={() => setSelected(null)}>关闭</button>
                    </div>
                    {selected.map((item, i) => (
                        <div key={i} style={{ padding: 12, borderBottom: '1px solid var(--color-border-light)', marginBottom: 8 }}>
                            <div style={{ fontWeight: 500, marginBottom: 4 }}>{item.title}</div>
                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{item.content}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
