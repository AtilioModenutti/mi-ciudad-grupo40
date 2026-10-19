import { MOCK_AUDIOGUIAS, MOCK_EVENTOS } from "@/mocks/eventos.mock";
import { AudioguiaItem, Evento } from "@/tipos/agenda";

const simularLatencia = <T>(datos: T, delayMs = 350): Promise<T> => {
  return new Promise((resolve) => setTimeout(() => resolve(datos), delayMs));
};

export const AgendaServicio = {
  async obtenerEventos(): Promise<Evento[]> {
    const copia = await simularLatencia([...MOCK_EVENTOS]);
    return copia.sort(
      (a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime(),
    );
  },

  async obtenerEventoPorId(id: string): Promise<Evento | null> {
    const eventos = await simularLatencia(MOCK_EVENTOS);
    return eventos.find((e) => e.id === id) ?? null;
  },

  async obtenerAudioguiaPorLugar(
    lugarId: string,
  ): Promise<AudioguiaItem | null> {
    const audios = await simularLatencia(MOCK_AUDIOGUIAS);
    return audios.find((a) => a.lugarId === lugarId) ?? null;
  },

  async obtenerTodasLasAudioguias(): Promise<AudioguiaItem[]> {
    return simularLatencia([...MOCK_AUDIOGUIAS]);
  },
};
