'use client'

import { useState, useEffect, useCallback } from 'react'

/**
 * useLocalStorage — persistent state backed by localStorage.
 * SSR-safe: initialises with `initialValue` on server, hydrates on client.
 *
 * @param {string} key          localStorage key
 * @param {*}      initialValue fallback when key absent
 */
export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(initialValue)
  const [hydrated, setHydrated] = useState(false)

  // Hydrate from localStorage on mount (client only)
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key)
      if (item !== null) {
        setStoredValue(JSON.parse(item))
      }
    } catch (err) {
      console.warn(`useLocalStorage read error for "${key}":`, err)
    }
    setHydrated(true)
  }, [key])

  const setValue = useCallback(
    (value) => {
      try {
        // Support functional updates
        const valueToStore =
          value instanceof Function ? value(storedValue) : value
        setStoredValue(valueToStore)
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
      } catch (err) {
        console.warn(`useLocalStorage write error for "${key}":`, err)
      }
    },
    [key, storedValue]
  )

  return [storedValue, setValue, hydrated]
}
