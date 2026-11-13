import { useEffect, useRef } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { Room } from '@colyseus/sdk'
import client from '../game/colyseus'
import type { CharacterType } from '../game/objects/PlayerCharacter'

// Defines the state setters and callback required for session recovery.
type UseSessionRecoveryProps = {
  roomRef: { current: Room | null }
  setupRoomConnection: (connection: Room) => void
  setIsJoining: Dispatch<SetStateAction<boolean>>
  setIsReconnecting: Dispatch<SetStateAction<boolean>>
  setIsDisconnected: Dispatch<SetStateAction<boolean>>
  setCharacterType: Dispatch<SetStateAction<CharacterType | null>>
  setConnectionError: Dispatch<SetStateAction<string | null>>
}

function useSessionRecovery({
  roomRef,
  setupRoomConnection,
  setIsJoining,
  setIsReconnecting,
  setIsDisconnected,
  setCharacterType,
  setConnectionError,
}: UseSessionRecoveryProps) {
  // Reuse an ongoing session recovery request across effect executions.
  const recoveryPromiseRef = useRef<Promise<Room> | null>(null)

  // Track which effect execution is currently active.
  const effectGenerationRef = useRef(0)
  const isEffectActiveRef = useRef(false)

  // Restore an existing session after a page refresh or when returning to the tab.
  useEffect(() => {
    const effectGeneration = ++effectGenerationRef.current
    isEffectActiveRef.current = true

    // Prevent multiple recovery handlers within the same effect.
    let isHandlingRecovery = false

    async function recoverSession() {
      // Avoid duplicate attempts or reconnecting an existing room.
      if (roomRef.current || isHandlingRecovery) return

      const token = sessionStorage.getItem('barkada-reconnection-token')
      const savedCharacterType = sessionStorage.getItem(
        'barkada-character-type',
      )

      // Skip recovery if no saved session exists.
      if (!token && !savedCharacterType) return

      // Validate the saved character type.
      const isValidCharacterType =
        savedCharacterType === 'boy' || savedCharacterType === 'girl'

      // Clear incomplete or invalid session data.
      if (!token || !isValidCharacterType) {
        sessionStorage.removeItem('barkada-reconnection-token')
        sessionStorage.removeItem('barkada-character-type')

        setConnectionError('Your previous session expired.')
        return
      }

      setIsJoining(true)
      setIsReconnecting(true)
      setCharacterType(savedCharacterType)

      isHandlingRecovery = true

      try {
        // Reuse an ongoing request or start a new session recovery.
        const recoveryPromise =
          recoveryPromiseRef.current ??
          (recoveryPromiseRef.current = client.reconnect(token))

        const connection = await recoveryPromise

        // Ignore stale effect executions or connections resolved after unmount.
        if (
          effectGenerationRef.current !== effectGeneration ||
          !isEffectActiveRef.current
        ) {
          if (!isEffectActiveRef.current) {
            await connection.leave()
          }

          return
        }

        setupRoomConnection(connection)

        setIsDisconnected(false)
        setIsReconnecting(false)
        setConnectionError(null)

        // Save the refreshed reconnection token.
        sessionStorage.setItem(
          'barkada-reconnection-token',
          connection.reconnectionToken,
        )

        setIsJoining(false)
      } catch (error) {
        // Ignore errors from outdated effect executions.
        if (
          effectGenerationRef.current !== effectGeneration ||
          !isEffectActiveRef.current
        ) {
          return
        }

        const errorCode =
          typeof error === 'object' && error !== null && 'code' in error
            ? error.code
            : undefined

        const errorMessage =
          error instanceof Error ? error.message : String(error)

        console.warn('Session recovery failed:', {
          code: errorCode,
          message: errorMessage,
        })

        const isInvalidTokenFormat = errorMessage.includes(
          'Invalid reconnection token format',
        )

        if (errorCode === 524 || errorCode === 522 || isInvalidTokenFormat) {
          // Clear invalid session data so the player can join a new room.
          sessionStorage.removeItem('barkada-reconnection-token')
          sessionStorage.removeItem('barkada-character-type')

          setConnectionError('Your previous session expired.')
        }

        setIsReconnecting(false)
        setIsJoining(false)
      } finally {
        // Allow a future recovery attempt once the request has settled.
        recoveryPromiseRef.current = null
        isHandlingRecovery = false
      }
    }

    // Attempt session recovery when the player returns to the tab.
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void recoverSession()
      }
    }

    // Recover immediately when the app loads.
    void recoverSession()

    // Also attempt recovery when the user returns to the browser tab.
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      // Mark this effect as inactive to prevent state updates after cleanup.
      isEffectActiveRef.current = false
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [
    roomRef,
    setupRoomConnection,
    setIsJoining,
    setIsReconnecting,
    setIsDisconnected,
    setCharacterType,
    setConnectionError,
  ])
}

export default useSessionRecovery
