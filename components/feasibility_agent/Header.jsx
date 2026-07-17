// import { useState, useEffect } from "react";
// // import { Moon, Sun } from "lucide-react";
// import logoLight from "./assets/logo-light.png";
// import logoDark from "./assets/logo-dark.png";
// import { useLegacyLocation as useLocation } from "@/components/feasibility_agent/useLegacyNavigate"; import Link from "next/link";

// const Header = () => {
//   const [darkMode, setDarkMode] = useState(false);
//   const [showDropdown, setShowDropdown] = useState(false);
//   const location = useLocation();

//   // Close dropdown when clicking outside
//   useEffect(() => {
//     const handleClickOutside = () => {
//       if (showDropdown) {
//         setShowDropdown(false);
//       }
//     };

//     document.addEventListener("click", handleClickOutside);
//     return () => {
//       document.removeEventListener("click", handleClickOutside);
//     };
//   }, [showDropdown]);

//   // Handle dropdown toggle
//   const handleDropdownToggle = (e) => {
//     e.stopPropagation();
//     setShowDropdown(!showDropdown);
//   };

//   // useEffect(() => {
//   //   const isDark = localStorage.getItem("darkMode") === "true";
//   //   setDarkMode(isDark);
//   //   if (isDark) {
//   //     document.documentElement.setAttribute("data-bs-theme", "dark");
//   //   }
//   // }, []);

//   // const toggleDarkMode = () => {
//   //   const newDarkMode = !darkMode;
//   //   setDarkMode(newDarkMode);
//   //   localStorage.setItem("darkMode", newDarkMode.toString());
//   //   if (newDarkMode) {
//   //     document.documentElement.setAttribute("data-bs-theme", "dark");
//   //   } else {
//   //     document.documentElement.setAttribute("data-bs-theme", "light");
//   //   }
//   // };

//   return (
//     <header
//       className={`${darkMode ? "bg-dark" : "bg-light"} border-bottom border-secondary px-4 py-3`}
//     >
//       <div className="container-fluid">
//         <div className="d-flex align-items-center justify-content-between">
//           <div className="d-flex align-items-center gap-3">
//             <Link href={"/"}>
//               <img
//                 src={darkMode ? logoDark : logoLight}
//                 alt="Real Estate Simulator"
//                 className="h-50"
//                 style={{ height: "100px", width: "200px" }}
//               />
//             </Link>
//             {/* <h1 className="h3 mb-0 text-center text-primary fw-bold">Real Estate Simulator</h1> */}
//           </div>

//           {/* Dropdown for additional tools */}
//           <div className="position-relative">
//             <button
//               className="btn btn-outline-primary dropdown-toggle"
//               type="button"
//               id="toolsDropdown"
//               onClick={handleDropdownToggle}
//               aria-expanded={showDropdown}
//             >
//               <i className="fas fa-tools me-1"></i>
//               Tools
//             </button>
//             <ul
//               className={`dropdown-menu mt-2 ${showDropdown ? "show" : ""}`}
//               style={{
//                 right: 0,
//                 left: "auto",
//                 minWidth: "200px",
//                 zIndex: 1000
//               }}
//             >
//               <li>
//                 <Link
//                   className={`dropdown-item ${location.pathname === "/construction-timetable/" ? "active bg-primary text-white" : ""
//                     }`}
//                   href="/feasibility/construction-timetable/"
//                   onClick={() => setShowDropdown(false)}
//                 >
//                   <i className="fas fa-calendar-alt me-2"></i>
//                   Construction Timetable
//                 </Link>
//               </li>
//               <li>
//                 <Link
//                   className={`dropdown-item ${location.pathname === "/parking-logic/" ? "active bg-primary text-white" : ""
//                     }`}
//                   href="/feasibility/parking-logic/"
//                   onClick={() => setShowDropdown(false)}
//                 >
//                   <i className="fas fa-parking me-2"></i>
//                   Parking Logic
//                 </Link>
//               </li>
//             </ul>
//           </div>

//           {/* <button 
//             className={`btn ${darkMode ? 'btn-outline-light' : 'btn-outline-secondary'} btn-sm`}
//             onClick={toggleDarkMode}
//             style={{ width: '40px', height: '40px' }}
//           >
//             {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
//           </button> */}
//         </div>
//       </div>
//     </header>
//   );
// };

// export default Header;

import { useState, useEffect } from "react";
import { FaTools, FaCalendarAlt, FaParking, FaRoad, FaSun, FaMoon } from "react-icons/fa";
import logoLight from "./assets/logo-light.png";
import logoDark from "./assets/logo-dark.png";
import { useLegacyLocation as useLocation } from "@/components/feasibility_agent/useLegacyNavigate"; 
import Link from "next/link";

const Header = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const location = useLocation();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (showDropdown) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [showDropdown]);

  // Handle dropdown toggle
  const handleDropdownToggle = (e) => {
    e.stopPropagation();
    setShowDropdown(!showDropdown);
  };

  const isNewRateSimulatorPage =
    location.pathname.replace(/\/$/, "") === "/new_rate_simulator";

  if (isNewRateSimulatorPage) {
    return null;
  }

  useEffect(() => {
    const isDark = localStorage.getItem("darkMode") === "true";
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.setAttribute("data-bs-theme", "dark");
    }
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem("darkMode", newDarkMode.toString());
    if (newDarkMode) {
      document.documentElement.setAttribute("data-bs-theme", "dark");
    } else {
      document.documentElement.setAttribute("data-bs-theme", "light");
    }
  };

  return (
    <header
      className={`${darkMode ? "bg-dark" : "bg-light"} border-bottom border-secondary px-4 py-3`}
    >
      <div className="container-fluid">
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-3">
            <Link href={"/feasibility"}>
              <img
                src={darkMode ? logoDark.src : logoLight.src}
                alt="Real Estate Simulator"
                className="h-50"
                style={{ height: "100px", width: "200px" }}
              />
            </Link>
            {/* <h1 className="h3 mb-0 text-center text-primary fw-bold">Real Estate Simulator</h1> */}
          </div>

          {/* Dropdown for additional tools */}
          <div className="position-relative  mt-2">
            <button
              className="btn btn-outline-primary dropdown-toggle"
              type="button"
              id="toolsDropdown"
              onClick={handleDropdownToggle}
              aria-expanded={showDropdown}
            >
              <FaTools className="me-1" />
              Tools
            </button>
            <ul
              className={`dropdown-menu mt-2 ${showDropdown ? "show" : ""}`}
              style={{
                right: 0,
                left: "auto",
                minWidth: "200px",
                zIndex: 1000
              }}
            >
              <li>
                <Link
                  className={`dropdown-item ${location.pathname === "/construction-timetable/" ? "active bg-primary text-white" : ""
                    }`}
                  href="/feasibility/construction-timetable/"
                  onClick={() => setShowDropdown(false)}
                >
                  
                  <FaCalendarAlt className="me-2" />
                  Construction Timetable
                </Link>
              </li>
              <li>
                <Link
                  className={`dropdown-item ${location.pathname === "/parking-logic/" ? "active bg-primary text-white" : ""
                    }`}
                  href="/feasibility/parking-logic/"
                  onClick={() => setShowDropdown(false)}
                >
                  <FaParking className="me-2" />
                  Parking Logic
                </Link>
              </li>
              <li>
                <Link
                  className={`dropdown-item ${location.pathname === "/osm-logic/" ? "active bg-primary text-white" : ""
                    }`}
                  href="/feasibility/osm-logic/"
                  onClick={() => setShowDropdown(false)}
                >
                  <FaRoad className="me-2" />
                  Osm logic
                </Link>
              </li>
            </ul>
          </div>

          <button 
            className={`btn ${darkMode ? 'btn-outline-light' : 'btn-outline-secondary'} btn-sm`}
            onClick={toggleDarkMode}
            style={{ width: '40px', height: '40px' }}
          >
            {darkMode ? <FaSun className="h-5 w-5" /> : <FaMoon className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
