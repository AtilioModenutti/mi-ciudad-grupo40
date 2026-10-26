export interface Visita {
  id: string;
  lugarId: string;
  fecha: string;
  metodo: "qr" | "proximidad" | "manual";
  nota: string | null;
  fotos: string[];
  sincronizada: boolean;
}
