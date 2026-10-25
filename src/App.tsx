import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { Navbar } from './components/Navbar';
import { JoinPage } from './pages/JoinPage';
import { PlayerLobbyPage } from './pages/PlayerLobbyPage';
import { PlayerGamePage } from './pages/PlayerGamePage';
import { PlayerResultPage } from './pages/PlayerResultPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminQuestionBankPage } from './pages/AdminQuestionBankPage';
import { AdminCreateGamePage } from './pages/AdminCreateGamePage';
import { AdminHostPage } from './pages/AdminHostPage';
import { AdminGamesManager } from './pages/AdminGamesManager';
import { AdminPlayersManager } from './pages/AdminPlayersManager';
import { testFirestoreConnection } from './lib/firebase';
import { getAuthHeaders, clearAuthToken } from './lib/auth';

export default function App() {
  const [currentView, setCurrentView] = useState<string>('join');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [adminUser, setAdminUser] = useState<any | null>(null);

  // Player session data
  const [playerSession, setPlayerSession] = useState<{
    gameId: string;
    roomCode: string;
    gameTitle: string;
    playerId: string;
    sessionId: string;
    displayName: string;
    carNumber: number;
    carColor: string;
  } | null>(null);

  // Admin active host data
  const [hostGameData, setHostGameData] = useState<{
    gameId: string;
    roomCode: string;
  } | null>(null);

  // Completed game report
  const [gameReport, setGameReport] = useState<any | null>(null);

  // Initialize Socket.IO connection
  useEffect(() => {
    // Test Firestore database connection
    testFirestoreConnection();

    const socketInstance = io({
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    setSocket(socketInstance);

    // Check if admin is already logged in
    fetch('/api/auth/me', {
      headers: getAuthHeaders(),
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setAdminUser(data.user);
        }
      })
      .catch(() => {});

    // Check URL search parameters for shared room code
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      if (code) {
        // Automatically prefill or stay on join
        setCurrentView('join');
      }
    }

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // Handle Logout
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
    } catch (err) {}
    clearAuthToken();
    setAdminUser(null);
    setCurrentView('join');
  };

  // Student successfully joined via JoinPage
  const handleJoinSuccess = (sessionData: {
    gameId: string;
    roomCode: string;
    gameTitle: string;
    playerId: string;
    sessionId: string;
    displayName: string;
    carNumber: number;
    carColor: string;
  }) => {
    setPlayerSession(sessionData);

    // Emit socket room:join event
    if (socket) {
      socket.emit('room:join', {
        roomCode: sessionData.roomCode,
        displayName: sessionData.displayName,
        carColor: sessionData.carColor,
        sessionId: sessionData.sessionId,
      });
    }

    setCurrentView('player-lobby');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
        adminUser={adminUser}
        onLogout={handleLogout}
      />

      {/* Main Content Pages */}
      <main className="flex-1 flex flex-col">
        {/* 1. STUDENT PAGES */}
        {currentView === 'join' && (
          <JoinPage onJoinSuccess={handleJoinSuccess} />
        )}

        {currentView === 'player-lobby' && playerSession && (
          <PlayerLobbyPage
            socket={socket}
            gameId={playerSession.gameId}
            roomCode={playerSession.roomCode}
            gameTitle={playerSession.gameTitle}
            player={{
              id: playerSession.playerId,
              displayName: playerSession.displayName,
              carNumber: playerSession.carNumber,
              carColor: playerSession.carColor,
            }}
            onGameStarted={() => setCurrentView('player-game')}
            onExit={() => {
              setPlayerSession(null);
              setCurrentView('join');
            }}
          />
        )}

        {currentView === 'player-game' && playerSession && (
          <PlayerGamePage
            socket={socket}
            gameId={playerSession.gameId}
            roomCode={playerSession.roomCode}
            gameTitle={playerSession.gameTitle}
            player={{
              id: playerSession.playerId,
              displayName: playerSession.displayName,
              carNumber: playerSession.carNumber,
              carColor: playerSession.carColor,
            }}
            onGameFinished={(report) => {
              setGameReport(report);
              setCurrentView('player-result');
            }}
          />
        )}

        {currentView === 'player-result' && playerSession && (
          <PlayerResultPage
            report={gameReport}
            currentPlayerId={playerSession.playerId}
            onPlayAgain={() => {
              setPlayerSession(null);
              setGameReport(null);
              setCurrentView('join');
            }}
          />
        )}

        {/* 2. ADMIN / TEACHER PAGES */}
        {currentView === 'admin-login' && (
          <AdminLoginPage
            onLoginSuccess={(user) => {
              setAdminUser(user);
              setCurrentView('admin-dashboard');
            }}
            onBackToJoin={() => setCurrentView('join')}
          />
        )}

        {currentView === 'admin-dashboard' && (
          <AdminDashboardPage
            adminUser={adminUser}
            onNavigate={(view, data) => {
              if (view === 'admin-host' && data) {
                setHostGameData({ gameId: data.gameId, roomCode: data.roomCode });
                setCurrentView('admin-host');
              } else {
                setCurrentView(view);
              }
            }}
          />
        )}

        {currentView === 'admin-question-bank' && (
          <AdminQuestionBankPage onBack={() => setCurrentView('admin-dashboard')} />
        )}

        {currentView === 'admin-create-game' && (
          <AdminCreateGamePage
            onGameCreated={(gameData) => {
              setHostGameData(gameData);
              setCurrentView('admin-host');
            }}
            onBack={() => setCurrentView('admin-dashboard')}
          />
        )}

        {currentView === 'admin-host' && hostGameData && (
          <AdminHostPage
            socket={socket}
            gameId={hostGameData.gameId}
            roomCode={hostGameData.roomCode}
            onExit={() => {
              setHostGameData(null);
              setCurrentView('admin-dashboard');
            }}
          />
        )}

        {currentView === 'admin-games' && (
          <AdminGamesManager
            onBack={() => setCurrentView('admin-dashboard')}
            onNavigateToCreate={() => setCurrentView('admin-create-game')}
            onNavigateToHost={(gameId, roomCode) => {
              setHostGameData({ gameId, roomCode });
              setCurrentView('admin-host');
            }}
          />
        )}

        {currentView === 'admin-players' && (
          <AdminPlayersManager
            onBack={() => setCurrentView('admin-dashboard')}
            onNavigateToHost={(gameId, roomCode) => {
              setHostGameData({ gameId, roomCode });
              setCurrentView('admin-host');
            }}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 border-t border-slate-900 bg-slate-950 text-center text-xs text-slate-500">
        <p>
          Edu Race 2D © 2026 • Platform Kuis Balapan Edukasi Real-Time untuk Siswa & Guru
        </p>
      </footer>
    </div>
  );
}
