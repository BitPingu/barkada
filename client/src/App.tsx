import { lazy, Suspense } from "react";

const Game = lazy(() => import("./game/Game"));

// Render application and Game component
function App() {
  return (
    <main className="game-page">
      <h1>Welcome to Barkada</h1>
      <div className="game-container">
        {/* Load game separately from app bundle */}
        <Suspense fallback={<div>Loading game...</div>}>
          <Game />
        </Suspense>
      </div>
    </main>
  );
}

export default App;
