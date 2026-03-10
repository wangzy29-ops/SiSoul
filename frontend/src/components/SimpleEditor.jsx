import { useRef, useEffect } from 'react';

export default function SimpleEditor({ value, onChange, placeholder, style }) {
    const editorRef = useRef(null);

    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value || '';
        }
    }, [value]);

    const handleInput = () => {
        if (onChange && editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const exec = (command, value = null) => {
        document.execCommand(command, false, value);
        handleInput();
        editorRef.current.focus();
    };

    return (
        <div style={{ border: '1px solid var(--border-color)', borderRadius: 2, display: 'flex', flexDirection: 'column', ...style }}>
            <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: 6, flexWrap: 'wrap', backgroundColor: '#f8f9fa' }}>
                <button type="button" onClick={() => exec('bold')} style={btnStyle}><b>B</b></button>
                <button type="button" onClick={() => exec('italic')} style={btnStyle}><i>I</i></button>
                <button type="button" onClick={() => exec('underline')} style={btnStyle}><u>U</u></button>
                <div style={{ width: 1, backgroundColor: '#ddd', margin: '0 4px' }} />
                <button type="button" onClick={() => exec('insertUnorderedList')} style={btnStyle}>• List</button>
                <button type="button" onClick={() => exec('insertOrderedList')} style={btnStyle}>1. List</button>
                <div style={{ width: 1, backgroundColor: '#ddd', margin: '0 4px' }} />
                <button type="button" onClick={() => exec('justifyLeft')} style={btnStyle}>Left</button>
                <button type="button" onClick={() => exec('justifyCenter')} style={btnStyle}>Center</button>
                <button type="button" onClick={() => exec('justifyRight')} style={btnStyle}>Right</button>
            </div>
            <div
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                onBlur={handleInput}
                style={{
                    flex: 1,
                    padding: 12,
                    outline: 'none',
                    overflowY: 'auto',
                    minHeight: 150,
                    backgroundColor: '#fff',
                }}
                data-placeholder={placeholder}
            />
        </div>
    );
}

const btnStyle = {
    padding: '4px 8px',
    border: '1px solid #ccc',
    backgroundColor: '#fff',
    borderRadius: 2,
    cursor: 'pointer',
    fontSize: 12,
    color: '#333'
};
