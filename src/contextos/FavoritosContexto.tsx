import { guardarFavoritos, obtenerFavoritos } from "@/servicios/favoritos";
import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";
import { Alert } from "react-native";

type FavoritosContextoTipo = {
  favoritos: string[];
  cambiarFavorito: (id: string) => void;
  favoritosListos: boolean;
  errorFavoritos: string;
};

const ContextoFavoritos = createContext<FavoritosContextoTipo | undefined>(
  undefined,
);

export function ProveedorFavoritos({ children }: { children: ReactNode }) {
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [favoritosListos, setFavoritosListos] = useState(false);
  const [errorFavoritos, setErrorFavoritos] = useState("");

  useEffect(() => {
    let activo = true;

    obtenerFavoritos()
      .then((guardados) => {
        if (activo) {
          setFavoritos(guardados);
          setFavoritosListos(true);
        }
      })
      .catch(() => {
        if (activo) {
          setErrorFavoritos("No se pudieron recuperar los favoritos.");
        }
      });

    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    if (!favoritosListos) {
      return;
    }

    guardarFavoritos(favoritos).catch(() => {
      Alert.alert("Error", "No se pudieron guardar los favoritos.");
    });
  }, [favoritos, favoritosListos]);

  function cambiarFavorito(id: string) {
    setFavoritos((actuales) => {
      if (actuales.includes(id)) {
        return actuales.filter((favoritoId) => favoritoId !== id);
      }

      return [...actuales, id];
    });
  }

  return (
    <ContextoFavoritos.Provider
      value={{ favoritos, cambiarFavorito, favoritosListos, errorFavoritos }}
    >
      {children}
    </ContextoFavoritos.Provider>
  );
}

export function useFavoritos() {
  const contexto = useContext(ContextoFavoritos);

  if (contexto === undefined) {
    throw new Error("Falta el ProveedorFavoritos");
  }

  return contexto;
}
