// src/servicios/agenda.servicio.ts
import { MOCK_EVENTOS } from "@/mocks/eventos.mock";
import { Evento } from "@/tipos/agenda";
import * as SecureStore from "expo-secure-store";
import Storage from "expo-sqlite/kv-store";
import { Platform } from "react-native";

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://api-miciudad.lansdev.com.ar";

const CLAVE_CACHE_EVENTOS = "cache_eventos_colon";
const CLAVE_EVENTOS_GUARDADOS_LOCAL = "eventos_guardados_local";

export const AgendaServicio = {
  /**
   * Obtiene todos los eventos de Colón.
   * Estrategia de cátedra: API real -> Caché persistente -> Mocks (fallback)
   */
  async obtenerEventos(): Promise<Evento[]> {
    try {
      const respuesta = await fetch(`${BASE_URL}/eventos`, {
        headers: { Accept: "application/json" },
      });

      if (!respuesta.ok) {
        throw new Error(`Error en API: ${respuesta.status}`);
      }

      const resultado = await respuesta.json();
      const lista: Evento[] = Array.isArray(resultado)
        ? resultado
        : (resultado.datos ?? []);

      const listaOrdenada = lista.sort(
        (a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime(),
      );

      // Guardamos la copia fresca en caché local persistente
      if (Platform.OS !== "web") {
        await Storage.setItem(
          CLAVE_CACHE_EVENTOS,
          JSON.stringify(listaOrdenada),
        );
      }

      return listaOrdenada;
    } catch (error) {
      console.warn(
        "Fallo conexión con API de eventos. Consultando caché:",
        error,
      );

      // Si falla la red, buscamos primero en la caché de eventos reales
      if (Platform.OS !== "web") {
        try {
          const cache = await Storage.getItem(CLAVE_CACHE_EVENTOS);
          if (cache) {
            const eventosCache: Evento[] = JSON.parse(cache);
            return eventosCache;
          }
        } catch (e) {
          console.warn("No se pudo leer la caché local:", e);
        }
      }

      // Si la caché está vacía, usamos los mocks de respaldo
      return [...MOCK_EVENTOS].sort(
        (a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime(),
      );
    }
  },

  /**
   * Obtiene el detalle de un evento por ID
   */
  async obtenerEventoPorId(id: string): Promise<Evento | null> {
    try {
      const respuesta = await fetch(`${BASE_URL}/eventos/${id}`);
      if (respuesta.ok) {
        const data = await respuesta.json();
        return data.datos ? data.datos : data;
      }
      throw new Error(`No encontrado: ${respuesta.status}`);
    } catch {
      const todos = await this.obtenerEventos();
      return todos.find((e) => e.id === id) ?? null;
    }
  },

  /**
   * Obtiene el token de sesión guardado por Atilio en SecureStore
   */
  async obtenerTokenSesion(): Promise<string | null> {
    if (Platform.OS === "web") return null;
    try {
      return (
        (await SecureStore.getItemAsync("token")) ||
        (await SecureStore.getItemAsync("token_auth")) ||
        null
      );
    } catch {
      return null;
    }
  },

  /**
   * Consulta si un evento está guardado (en el backend o local)
   */
  async estaEventoGuardado(eventoId: string): Promise<boolean> {
    const token = await this.obtenerTokenSesion();

    if (token) {
      try {
        const res = await fetch(`${BASE_URL}/yo/eventos-guardados`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const datos = await res.json();
          const lista: any[] = Array.isArray(datos)
            ? datos
            : (datos.datos ?? []);
          return lista.some((item) => (item.eventoId ?? item.id) === eventoId);
        }
      } catch (e) {
        console.warn("Error al verificar evento guardado en API:", e);
      }
    }

    // Respaldo local en Storage
    if (Platform.OS !== "web") {
      try {
        const local = await Storage.getItem(CLAVE_EVENTOS_GUARDADOS_LOCAL);
        if (local) {
          const ids: string[] = JSON.parse(local);
          return ids.includes(eventoId);
        }
      } catch {}
    }

    return false;
  },

  /**
   * Guarda un evento en la cuenta del usuario (/yo/eventos-guardados) y en almacenamiento local
   */
  async guardarEvento(eventoId: string): Promise<boolean> {
    const token = await this.obtenerTokenSesion();

    if (token) {
      try {
        await fetch(`${BASE_URL}/yo/eventos-guardados`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ eventoId }),
        });
      } catch (e) {
        console.warn(
          "No se pudo sincronizar evento guardado con el servidor:",
          e,
        );
      }
    }

    // Persistencia local
    if (Platform.OS !== "web") {
      try {
        const local = await Storage.getItem(CLAVE_EVENTOS_GUARDADOS_LOCAL);
        const ids: string[] = local ? JSON.parse(local) : [];
        if (!ids.includes(eventoId)) {
          ids.push(eventoId);
          await Storage.setItem(
            CLAVE_EVENTOS_GUARDADOS_LOCAL,
            JSON.stringify(ids),
          );
        }
      } catch {}
    }

    return true;
  },

  /**
   * Quita un evento de los guardados (/yo/eventos-guardados/:id) y de local
   */
  async quitarEventoGuardado(eventoId: string): Promise<boolean> {
    const token = await this.obtenerTokenSesion();

    if (token) {
      try {
        await fetch(`${BASE_URL}/yo/eventos-guardados/${eventoId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (e) {
        console.warn("No se pudo quitar evento guardado del servidor:", e);
      }
    }

    // Quitar de local
    if (Platform.OS !== "web") {
      try {
        const local = await Storage.getItem(CLAVE_EVENTOS_GUARDADOS_LOCAL);
        if (local) {
          const ids: string[] = JSON.parse(local);
          const filtrados = ids.filter((id) => id !== eventoId);
          await Storage.setItem(
            CLAVE_EVENTOS_GUARDADOS_LOCAL,
            JSON.stringify(filtrados),
          );
        }
      } catch {}
    }

    return true;
  },
};
