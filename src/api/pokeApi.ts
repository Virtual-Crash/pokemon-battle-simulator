import type { PokemonDetails, PokemonMove, PokemonSummary } from "../types";

const API_BASE_URL = "https://pokeapi.co/api/v2";

type PokeApiListResponse = {
  results: PokemonSummary[];
};

type PokeApiPokemonResponse = {
  id: number;
  name: string;
  height: number;
  weight: number;
  sprites: {
    front_default: string | null;
    other: {
      "official-artwork": {
        front_default: string | null;
      };
    };
  };
  abilities: Array<{
    ability: {
      name: string;
    };
  }>;
  types: Array<{
    type: {
      name: string;
    };
  }>;
  stats: Array<{
    base_stat: number;
    stat: {
      name: string;
    };
  }>;
  moves: Array<{
    move: {
      name: string;
      url: string;
    };
    version_group_details: Array<{
      level_learned_at: number;
    }>;
  }>;
};

type PokeApiMoveResponse = {
  name: string;
  accuracy: number | null;
  power: number | null;
  type: {
    name: string;
  };
  damage_class: {
    name: string;
  };
};

const titleCase = (value: string) =>
  value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const getStat = (pokemon: PokeApiPokemonResponse, statName: string) => {
  const stat = pokemon.stats.find((entry) => entry.stat.name === statName);
  return stat?.base_stat ?? 0;
};

const fallbackMove: PokemonMove = {
  name: "Tackle",
  type: "Normal",
  power: 40,
  accuracy: 100,
  damageClass: "physical",
};

const toPokemonMove = (move: PokeApiMoveResponse): PokemonMove | null => {
  if (
    !move.power ||
    move.damage_class.name === "status" ||
    (move.damage_class.name !== "physical" && move.damage_class.name !== "special")
  ) {
    return null;
  }

  return {
    name: titleCase(move.name),
    type: titleCase(move.type.name),
    power: move.power,
    accuracy: move.accuracy ?? 100,
    damageClass: move.damage_class.name,
  };
};

async function fetchBattleMoves(pokemon: PokeApiPokemonResponse): Promise<PokemonMove[]> {
  const levelUpMoves = pokemon.moves
    .filter((entry) =>
      entry.version_group_details.some((detail) => detail.level_learned_at > 0),
    )
    .slice(0, 18);
  const candidateMoves = levelUpMoves.length > 0 ? levelUpMoves : pokemon.moves.slice(0, 18);
  const moveResponses = await Promise.all(
    candidateMoves.map(async (entry) => {
      const response = await fetch(entry.move.url);

      if (!response.ok) {
        return null;
      }

      const move = (await response.json()) as PokeApiMoveResponse;
      return toPokemonMove(move);
    }),
  );
  const damagingMoves = moveResponses.filter((move): move is PokemonMove => Boolean(move));

  return damagingMoves.slice(0, 4).length > 0 ? damagingMoves.slice(0, 4) : [fallbackMove];
}

export async function fetchPokemonList(limit = 151): Promise<PokemonSummary[]> {
  const response = await fetch(`${API_BASE_URL}/pokemon?limit=${limit}`);

  if (!response.ok) {
    throw new Error("Could not load Pokemon list.");
  }

  const data = (await response.json()) as PokeApiListResponse;
  return data.results;
}

export async function fetchPokemon(nameOrId: string): Promise<PokemonDetails> {
  const response = await fetch(
    `${API_BASE_URL}/pokemon/${encodeURIComponent(nameOrId.toLowerCase())}`,
  );

  if (!response.ok) {
    throw new Error(`Could not load ${nameOrId}.`);
  }

  const data = (await response.json()) as PokeApiPokemonResponse;
  const moves = await fetchBattleMoves(data);
  const sprite =
    data.sprites.other["official-artwork"].front_default ??
    data.sprites.front_default ??
    "";

  return {
    id: data.id,
    name: titleCase(data.name),
    height: data.height,
    weight: data.weight,
    sprite,
    officialArtwork: data.sprites.other["official-artwork"].front_default ?? sprite,
    types: data.types.map((entry) => titleCase(entry.type.name)),
    abilities: data.abilities.map((entry) => titleCase(entry.ability.name)),
    moves,
    stats: {
      hp: getStat(data, "hp"),
      attack: getStat(data, "attack"),
      defense: getStat(data, "defense"),
      specialAttack: getStat(data, "special-attack"),
      specialDefense: getStat(data, "special-defense"),
      speed: getStat(data, "speed"),
    },
  };
}
