import { useEffect, useMemo, useState } from "react";
import { fetchPokemon, fetchPokemonList } from "./api/pokeApi";
import type { PokemonDetails, PokemonMove, PokemonSummary } from "./types";

const DEFAULT_FIRST = "charizard";
const DEFAULT_SECOND = "blastoise";

type BattleSide = "first" | "second";

type BattleSession = {
  firstHp: number;
  secondHp: number;
  activeSide: BattleSide;
  actionCount: number;
  messages: string[];
  winner: BattleSide | null;
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const hpPercent = (currentHp: number, maxHp: number) =>
  clamp(Math.round((currentHp / maxHp) * 100), 0, 100);

const calculateMoveDamage = (
  attacker: PokemonDetails,
  defender: PokemonDetails,
  move: PokemonMove,
  actionCount: number,
) => {
  const attackStat =
    move.damageClass === "special" ? attacker.stats.specialAttack : attacker.stats.attack;
  const defenseStat =
    move.damageClass === "special" ? defender.stats.specialDefense : defender.stats.defense;
  const sameTypeBonus = attacker.types.includes(move.type) ? 1.2 : 1;
  const variance = 0.92 + ((attacker.id * 17 + defender.id * 11 + actionCount) % 9) / 100;
  const rawDamage =
    ((move.power / 12 + 3) * (attackStat / Math.max(35, defenseStat))) *
    sameTypeBonus *
    variance;

  return clamp(Math.round(rawDamage), 3, 120);
};

const moveHits = (attacker: PokemonDetails, move: PokemonMove, actionCount: number) => {
  const roll = (attacker.id * 31 + move.power * 7 + actionCount * 13) % 100;
  return roll < move.accuracy;
};

function PokemonCard({ pokemon }: { pokemon: PokemonDetails | null }) {
  if (!pokemon) {
    return <div className="pokemon-card empty">Choose a Pokemon</div>;
  }

  const totalStats = Object.values(pokemon.stats).reduce((sum, stat) => sum + stat, 0);

  return (
    <article className="pokemon-card">
      <div className="pokemon-portrait">
        {pokemon.officialArtwork ? (
          <img src={pokemon.officialArtwork} alt={pokemon.name} />
        ) : (
          <span>{pokemon.name}</span>
        )}
      </div>
      <div className="pokemon-meta">
        <p className="pokemon-number">#{String(pokemon.id).padStart(4, "0")}</p>
        <h2>{pokemon.name}</h2>
        <div className="type-row">
          {pokemon.types.map((type) => (
            <span key={type} className={`type-chip type-${type.toLowerCase()}`}>
              {type}
            </span>
          ))}
        </div>
      </div>
      <dl className="stat-grid">
        <div>
          <dt>HP</dt>
          <dd>{pokemon.stats.hp}</dd>
        </div>
        <div>
          <dt>ATK</dt>
          <dd>{pokemon.stats.attack}</dd>
        </div>
        <div>
          <dt>DEF</dt>
          <dd>{pokemon.stats.defense}</dd>
        </div>
        <div>
          <dt>SPD</dt>
          <dd>{pokemon.stats.speed}</dd>
        </div>
      </dl>
      <p className="total-stat">Base total {totalStats}</p>
    </article>
  );
}

function PokemonSelect({
  label,
  value,
  pokemonList,
  onChange,
}: {
  label: string;
  value: string;
  pokemonList: PokemonSummary[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="select-control">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {pokemonList.map((pokemon) => (
          <option key={pokemon.name} value={pokemon.name}>
            {pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)}
          </option>
        ))}
      </select>
    </label>
  );
}

function BattlePokemonPanel({
  pokemon,
  currentHp,
  isActive,
  side,
}: {
  pokemon: PokemonDetails;
  currentHp: number;
  isActive: boolean;
  side: "opponent" | "player";
}) {
  const percent = hpPercent(currentHp, pokemon.stats.hp);

  return (
    <div className={`battle-pokemon battle-pokemon-${side} ${isActive ? "active" : ""}`}>
      <div className="battle-nameplate">
        <div>
          <strong>{pokemon.name}</strong>
          <span>Lv. 50</span>
        </div>
        <div className="hp-track" aria-label={`${pokemon.name} HP`}>
          <span style={{ width: `${percent}%` }} />
        </div>
        <p>
          HP {currentHp}/{pokemon.stats.hp}
        </p>
      </div>
      <img src={pokemon.sprite || pokemon.officialArtwork} alt={pokemon.name} />
    </div>
  );
}

function BattleWindow({
  firstPokemon,
  secondPokemon,
  session,
  onMove,
  onReset,
  onClose,
}: {
  firstPokemon: PokemonDetails;
  secondPokemon: PokemonDetails;
  session: BattleSession;
  onMove: (move: PokemonMove) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const activePokemon = session.activeSide === "first" ? firstPokemon : secondPokemon;
  const isFinished = Boolean(session.winner);
  const winner =
    session.winner === "first" ? firstPokemon : session.winner === "second" ? secondPokemon : null;

  return (
    <div className="battle-overlay" role="dialog" aria-modal="true" aria-label="Pokemon battle">
      <section className="battle-window">
        <div className="battle-scene">
          <BattlePokemonPanel
            pokemon={secondPokemon}
            currentHp={session.secondHp}
            isActive={session.activeSide === "second" && !isFinished}
            side="opponent"
          />
          <BattlePokemonPanel
            pokemon={firstPokemon}
            currentHp={session.firstHp}
            isActive={session.activeSide === "first" && !isFinished}
            side="player"
          />
        </div>

        <div className="battle-command-box">
          <div className="dialog-text" aria-live="polite">
            {winner ? (
              <p>{winner.name} wins the battle!</p>
            ) : (
              <p>What will {activePokemon.name} do?</p>
            )}
            {session.messages.slice(-2).map((message) => (
              <span key={message}>{message}</span>
            ))}
          </div>

          {winner ? (
            <div className="battle-actions">
              <button type="button" onClick={onReset}>
                Battle Again
              </button>
              <button type="button" className="secondary-button" onClick={onClose}>
                Leave Battle
              </button>
            </div>
          ) : (
            <div className="move-grid" aria-label={`${activePokemon.name} moves`}>
              {activePokemon.moves.map((move) => (
                <button
                  key={`${activePokemon.id}-${move.name}`}
                  type="button"
                  className="move-button"
                  onClick={() => onMove(move)}
                >
                  <strong>{move.name}</strong>
                  <span>
                    {move.type} / Pow {move.power}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function App() {
  const [pokemonList, setPokemonList] = useState<PokemonSummary[]>([]);
  const [firstChoice, setFirstChoice] = useState(DEFAULT_FIRST);
  const [secondChoice, setSecondChoice] = useState(DEFAULT_SECOND);
  const [firstPokemon, setFirstPokemon] = useState<PokemonDetails | null>(null);
  const [secondPokemon, setSecondPokemon] = useState<PokemonDetails | null>(null);
  const [battleSession, setBattleSession] = useState<BattleSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;

    async function loadList() {
      try {
        const list = await fetchPokemonList();
        if (isCurrent) {
          setPokemonList(list);
        }
      } catch (caughtError) {
        if (isCurrent) {
          setError(caughtError instanceof Error ? caughtError.message : "Something went wrong.");
        }
      }
    }

    void loadList();

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);
    setError(null);

    async function loadSelectedPokemon() {
      try {
        const [loadedFirst, loadedSecond] = await Promise.all([
          fetchPokemon(firstChoice),
          fetchPokemon(secondChoice),
        ]);

        if (isCurrent) {
          setFirstPokemon(loadedFirst);
          setSecondPokemon(loadedSecond);
          setBattleSession(null);
        }
      } catch (caughtError) {
        if (isCurrent) {
          setError(caughtError instanceof Error ? caughtError.message : "Something went wrong.");
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    void loadSelectedPokemon();

    return () => {
      isCurrent = false;
    };
  }, [firstChoice, secondChoice]);

  const canBattle = useMemo(
    () => Boolean(firstPokemon && secondPokemon && !isLoading),
    [firstPokemon, isLoading, secondPokemon],
  );

  const createBattleSession = () => {
    if (!firstPokemon || !secondPokemon) {
      return null;
    }

    const activeSide =
      firstPokemon.stats.speed >= secondPokemon.stats.speed ? "first" : "second";

    return {
      firstHp: firstPokemon.stats.hp,
      secondHp: secondPokemon.stats.hp,
      activeSide,
      actionCount: 1,
      messages: [`${activeSide === "first" ? firstPokemon.name : secondPokemon.name} moves first.`],
      winner: null,
    } satisfies BattleSession;
  };

  const startBattle = () => {
    setBattleSession(createBattleSession());
  };

  const closeBattle = () => {
    setBattleSession(null);
  };

  const handleMove = (move: PokemonMove) => {
    if (!firstPokemon || !secondPokemon) {
      return;
    }

    setBattleSession((currentSession) => {
      if (!currentSession || currentSession.winner) {
        return currentSession;
      }

      const attacker =
        currentSession.activeSide === "first" ? firstPokemon : secondPokemon;
      const defender =
        currentSession.activeSide === "first" ? secondPokemon : firstPokemon;
      const defenderHpKey = currentSession.activeSide === "first" ? "secondHp" : "firstHp";
      const nextActiveSide = currentSession.activeSide === "first" ? "second" : "first";

      if (!moveHits(attacker, move, currentSession.actionCount)) {
        return {
          ...currentSession,
          activeSide: nextActiveSide,
          actionCount: currentSession.actionCount + 1,
          messages: [
            ...currentSession.messages,
            `${attacker.name} used ${move.name}, but it missed!`,
          ],
        };
      }

      const damage = calculateMoveDamage(
        attacker,
        defender,
        move,
        currentSession.actionCount,
      );
      const nextDefenderHp = Math.max(0, currentSession[defenderHpKey] - damage);
      const winner = nextDefenderHp <= 0 ? currentSession.activeSide : null;

      return {
        ...currentSession,
        [defenderHpKey]: nextDefenderHp,
        activeSide: winner ? currentSession.activeSide : nextActiveSide,
        actionCount: currentSession.actionCount + 1,
        winner,
        messages: [
          ...currentSession.messages,
          `${attacker.name} used ${move.name}. ${defender.name} took ${damage} damage.`,
        ],
      };
    });
  };

  return (
    <main className="app-shell">
      <section className="arena">
        <div className="arena-copy">
          <p className="eyebrow">PokeAPI Battle Lab</p>
          <h1>Pokemon Battle Simulator</h1>
          <p>
            Build a matchup from live Pokemon stats, then play a turn-based battle with
            moves loaded from PokeAPI.
          </p>
        </div>

        <div className="controls-panel">
          <PokemonSelect
            label="Challenger"
            value={firstChoice}
            pokemonList={pokemonList}
            onChange={setFirstChoice}
          />
          <PokemonSelect
            label="Opponent"
            value={secondChoice}
            pokemonList={pokemonList}
            onChange={setSecondChoice}
          />
          <button type="button" onClick={startBattle} disabled={!canBattle}>
            {isLoading ? "Loading..." : "Start Battle"}
          </button>
          <div className="battle-status" aria-live="polite">
            {battleSession ? (
              <>
                <span>Battle Ready</span>
                <strong>
                  {battleSession.winner
                    ? `${battleSession.winner === "first" ? firstPokemon?.name : secondPokemon?.name} wins`
                    : `${battleSession.activeSide === "first" ? firstPokemon?.name : secondPokemon?.name}'s turn`}
                </strong>
                <p>Use the battle window to choose one move each turn.</p>
              </>
            ) : (
              <p>Start a battle to open the game-style turn window.</p>
            )}
          </div>
        </div>

        {error ? <p className="error-banner">{error}</p> : null}
      </section>

      <section className="matchup" aria-label="Pokemon matchup">
        <PokemonCard pokemon={firstPokemon} />
        <div className="versus">VS</div>
        <PokemonCard pokemon={secondPokemon} />
      </section>

      {battleSession && firstPokemon && secondPokemon ? (
        <BattleWindow
          firstPokemon={firstPokemon}
          secondPokemon={secondPokemon}
          session={battleSession}
          onMove={handleMove}
          onReset={startBattle}
          onClose={closeBattle}
        />
      ) : null}
    </main>
  );
}
