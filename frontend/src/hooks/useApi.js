import { useState, useEffect, useCallback } from 'react';

export function useApi(apiFn, deps = [], autoFetch = true) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetch = useCallback(async (...args) => {
        setLoading(true);
        setError(null);
        try {
            const result = await apiFn(...args);
            setData(result);
            return result;
        } catch (err) {
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, deps);

    useEffect(() => {
        if (autoFetch) fetch();
    }, [autoFetch, fetch]);

    return { data, loading, error, refetch: fetch, setData };
}
