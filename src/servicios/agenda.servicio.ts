import { MOCK_AUDIOGUIAS, MOCK_EVENTOS } from "@/mocks/eventos.mock";
import { AudioguiaItem, Evento } from "@/tipos/agenda";

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://api-miciudad.lansdev.com.ar";

export const AgendaServicio = {
  /**
   * Obtiene todos los eventos de la API de Colón.
   * Si la API no responde o no hay internet, utiliza los mocks como respaldo (offline-first).
   */
  async obtenerEventos(): Promise<Evento[]> {
    try {
      const respuesta = await fetch(`${BASE_URL}/eventos`, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!respuesta.ok) {
        throw new Error(`Respuesta no exitosa: ${respuesta.status}`);
      }

      const resultado = await respuesta.json();
      // El PRD define la respuesta como { datos: Evento[], meta: {...} }
      const lista: Evento[] = Array.isArray(resultado)
        ? resultado
        : (resultado.datos ?? MOCK_EVENTOS);
      return lista.sort(
        (a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime(),
      );
    } catch (error) {
      console.warn("API inaccesible, utilizando datos mock de eventos:", error);
      return [...MOCK_EVENTOS].sort(
        (a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime(),
      );
    }
  },

  /**
   * Obtiene el detalle de un evento por ID consultando la API o el mock.
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
      // Fallback a los datos locales
      const eventoMock = MOCK_EVENTOS.find((e) => e.id === id);
      return eventoMock ?? null;
    }
  },

  /**
   * Obtiene la audioguía asociada a un lugar
   */
  async obtenerAudioguiaPorLugar(
    lugarId: string,
  ): Promise<AudioguiaItem | null> {
    const audios = MOCK_AUDIOGUIAS;
    return audios.find((a) => a.lugarId === lugarId) ?? null;
  },

  /**
   * Listado de todas las audioguías disponibles
   */
  async obtenerTodasLasAudioguias(): Promise<AudioguiaItem[]> {
    return [...MOCK_AUDIOGUIAS];
  },
};
