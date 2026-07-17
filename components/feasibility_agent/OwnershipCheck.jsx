import { useEffect, useState } from "react";
import { useLegacyNavigate as useNavigate } from "@/components/feasibility_agent/useLegacyNavigate";
// eslint-disable-next-line no-unused-vars
import OwnershipCheckForm from "./components/OwnershipCheckForm";
// eslint-disable-next-line no-unused-vars
import UpdatedRevenue from "./components/UpdatedRevenue";
// Header intentionally not imported to keep page minimal

const OwnershipCheck = () => {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(false);

//   useEffect(() => {
//     const savedTheme = localStorage.getItem("ownershipTheme");
//     const initialDark = savedTheme ? savedTheme === "dark" : (document.documentElement.getAttribute('data-bs-theme') === 'dark');
//     setIsDark(initialDark);
//     document.documentElement.setAttribute('data-bs-theme', initialDark ? 'dark' : 'light');
//   }, []);

//   // Form state and persistence are handled inside OwnershipCheckForm

//   const toggleTheme = () => {
//     const next = !isDark;
//     setIsDark(next);
//     localStorage.setItem("ownershipTheme", next ? "dark" : "light");
//     document.documentElement.setAttribute('data-bs-theme', next ? 'dark' : 'light');
//   };

  return (
    <div className={`min-vh-100 ${isDark ? "bg-dark text-white" : "bg-light"}`}>
      <main className="container py-5">
        <div className="row justify-content-center">
          <div className="col-lg-10">
            <div className={`card ${isDark ? "bg-dark text-white border-secondary" : ""}`}>
              <div className={`card-header d-flex align-items-center ${isDark ? "bg-secondary text-white" : ""}`}>
                <div className="d-flex justify-content-between align-items-center w-100">
                  <h5 className="card-title mb-0 text-primary">Developer share calculator</h5>
                  <div className="d-flex align-items-center gap-2">
                    {/* <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="themeSwitch"
                        checked={isDark}
                        onChange={toggleTheme}
                      />
                      <label className="form-check-label" htmlFor="themeSwitch">
                        {isDark ? "Dark" : "Light"}
                      </label>
                    </div> */}
                    <button className="btn btn-outline-primary" onClick={() => navigate("/new_rate_simulator")}>Go Back</button>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <OwnershipCheckForm isDark={isDark} />
                <UpdatedRevenue isDark={isDark} />
                <div className="mt-3 d-flex justify-content-end">
                  <button className="btn btn-primary" onClick={() => navigate('/irr')}>Calculate IRR</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default OwnershipCheck;


