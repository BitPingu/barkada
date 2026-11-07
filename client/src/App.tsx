import Game from "./game/Game";

// Render application and Game component
function App() {
  return (
    <main className="game-page">
      <h1>Welcome to Barkada</h1>
      <div className="game-container">
        <Game />
      </div>
    </main>
  );
}

export default App;
