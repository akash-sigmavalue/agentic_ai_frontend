"use client";

// Create a Context
import React, { createContext, useState, useContext, useRef } from "react";
import { initialState } from "./AppUtils";

const GlobalContext = createContext();

export const GlobalProvider = ({ children }) => {
  const [globalState, setGlobalState_] = useState({
    ...initialState,
  });

  const prevGlobalState = useRef(globalState);

  const setGlobalState = (obj) => {
    const changes_only = {};

    Object?.keys(obj)?.forEach((ky) => {
      // console.log("globalState[ky] !== obj[ky]: ", ky, prevGlobalState?.current[ky], obj[ky], prevGlobalState?.current[ky] !== obj[ky]);

      if (prevGlobalState?.current[ky] !== obj[ky]) {
        changes_only[ky] = obj[ky];
      }
    });

    Object?.keys(changes_only)?.length > 0 &&
      setGlobalState_((prevState) => {
        let final_changes = {
          ...prevState,
          ...changes_only,
        };

        prevGlobalState.current = final_changes;

        return final_changes;
      });

    if (
      Object?.keys(changes_only)?.length > 0 &&
      !window?.location?.origin?.includes("sigmavalue")
    ) {
      console.log("gState Changed: ", changes_only);
    }
  };

  return (
    <GlobalContext.Provider value={[globalState, setGlobalState]}>
      {children}
    </GlobalContext.Provider>
  );
};

// Custom hook for using the GlobalContext
// eslint-disable-next-line react-refresh/only-export-components
export const useGlobalState = () => {
  return useContext(GlobalContext);
};
