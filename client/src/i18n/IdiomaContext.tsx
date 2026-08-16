import { createContext, useContext, useState, type ReactNode } from "react";
import { translations } from "./translations";
import type { Idioma, Dicionario } from "./translations";

const CHAVE_LOCALSTORAGE = "bancoPt.idioma";

interface IdiomaContextValue {
  idioma: Idioma;
  setIdioma: (idioma: Idioma) => void;
  dict: Dicionario;
}

const IdiomaContext = createContext<IdiomaContextValue | undefined>(undefined);

function lerIdiomaGuardado(): Idioma {
  const guardado = localStorage.getItem(CHAVE_LOCALSTORAGE);
  return guardado === "en" ? "en" : "pt";
}

export function IdiomaProvider({ children }: { children: ReactNode }) {
  const [idioma, setIdiomaState] = useState<Idioma>(lerIdiomaGuardado());

  function setIdioma(novoIdioma: Idioma) {
    localStorage.setItem(CHAVE_LOCALSTORAGE, novoIdioma);
    setIdiomaState(novoIdioma);
  }

  return (
    <IdiomaContext.Provider value={{ idioma, setIdioma, dict: translations[idioma] }}>
      {children}
    </IdiomaContext.Provider>
  );
}

export function useIdioma() {
  const ctx = useContext(IdiomaContext);
  if (!ctx) throw new Error("useIdioma deve ser usado dentro de IdiomaProvider");
  return ctx;
}
