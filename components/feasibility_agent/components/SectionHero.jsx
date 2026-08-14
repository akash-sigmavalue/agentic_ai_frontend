import React from "react";

const SectionHero = ({ id, title, description, icon: Icon, illustration, comingSoon = false }) => {
  return (
    <div
      id={id}
      className="section-hero-container w-100 fade-in-up"
      style={{ scrollMarginTop: "120px" }}
    >
      <div className="section-hero-card">
        {/* Background decorative contour lines - shifted to right and denser */}
        <div className="section-hero-contours">
          <svg width="100%" height="100%" viewBox="0 0 500 200" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,0 Q100,50 150,100 T300,150 T500,80" fill="none" stroke="#448C74" strokeWidth="1" opacity="0.05" />
            <path d="M20,0 Q120,60 170,110 T320,160 T500,90" fill="none" stroke="#448C74" strokeWidth="1" opacity="0.06" />
            <path d="M40,0 Q140,70 190,120 T340,170 T500,100" fill="none" stroke="#448C74" strokeWidth="1" opacity="0.07" />
            <path d="M60,0 Q160,80 210,130 T360,180 T500,110" fill="none" stroke="#448C74" strokeWidth="1" opacity="0.08" />
            <path d="M80,0 Q180,90 230,140 T380,190 T500,120" fill="none" stroke="#448C74" strokeWidth="1" opacity="0.09" />
            <path d="M100,0 Q200,100 250,150 T400,200 T500,130" fill="none" stroke="#448C74" strokeWidth="1" opacity="0.1" />
            <path d="M150,0 Q250,120 300,170 T450,220 T500,150" fill="none" stroke="#448C74" strokeWidth="1" opacity="0.07" />
            <path d="M200,0 Q300,140 350,190 T500,240" fill="none" stroke="#448C74" strokeWidth="1" opacity="0.05" />
          </svg>
        </div>

        <div className="row g-0 align-items-center h-100 position-relative w-100">
          {/* Left Content Area (60% Desktop) */}
          <div className="col-12 col-lg-7 section-hero-content">
            <div className="d-flex flex-column flex-md-row align-items-center align-items-md-start gap-3">
              {/* Icon Container */}
              {Icon && (
                <div className="section-hero-icon-container flex-shrink-0 mt-md-1">
                  <Icon size={38} color="#124E37" />
                </div>
              )}
              
              {/* Text Area */}
              <div>
                <div className="d-flex align-items-center gap-3 mb-2 flex-wrap justify-content-center justify-content-md-start">
                  <h1 className="section-hero-title mb-0">
                    {title}
                  </h1>
                  {comingSoon && (
                    <span 
                      className="badge rounded-pill px-3 py-1"
                      style={{
                        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                        color: "#ffffff",
                        fontSize: "0.75rem",
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                        fontWeight: "700",
                        boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
                        border: "1px solid rgba(255,255,255,0.2)"
                      }}
                    >
                      <i className="fa-solid fa-sparkles me-1"></i> Coming Soon
                    </span>
                  )}
                </div>
                <div className="section-hero-accent-line mb-3 mx-auto mx-md-0"></div>
                <p className="section-hero-description mb-0">
                  {description}
                </p>
              </div>
            </div>
          </div>

          {/* Right Visual Area (40% Desktop) */}
          {illustration && (
            <div className="col-12 col-lg-5 d-flex justify-content-lg-end justify-content-center mt-4 mt-lg-0 section-hero-visual">
              <div className="illustration-wrapper">
                {/* Optional subtle glow behind the 3D asset */}
                <div className="illustration-glow"></div>
                <img 
                  src={illustration} 
                  alt={title} 
                  className="illustration-image"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .section-hero-container {
          margin-bottom: 40px;
        }

        .section-hero-card {
          position: relative;
          width: 100%;
          min-height: 180px;
          border-radius: 20px;
          background: linear-gradient(110deg, #ffffff 0%, #f9fcfb 45%, rgba(68,140,116,0.18) 100%);
          border: 1px solid #E3E9EF;
          box-shadow: 0 4px 20px rgba(18, 21, 25, 0.04);
          overflow: hidden;
          padding: 28px 36px;
          display: flex;
          align-items: center;
        }

        .section-hero-contours {
          position: absolute;
          top: 0;
          right: 0;
          width: 65%;
          height: 100%;
          pointer-events: none;
          z-index: 0;
          mask-image: linear-gradient(to right, transparent, black 40%);
          -webkit-mask-image: linear-gradient(to right, transparent, black 40%);
        }

        .section-hero-content {
          z-index: 1;
        }

        .section-hero-icon-container {
          width: 72px;
          height: 72px;
          background: #ffffff;
          border-radius: 16px;
          border: 1.5px solid rgba(68, 140, 116, 0.25);
          box-shadow: 0 6px 14px rgba(0,0,0,0.04);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .section-hero-title {
          font-weight: 750;
          font-size: 34px;
          color: #121519;
          line-height: 1.15;
          letter-spacing: -0.5px;
          margin: 0;
        }

        .section-hero-accent-line {
          width: 32px;
          height: 3px;
          border-radius: 10px;
          background: #448C74;
        }

        .section-hero-description {
          font-size: 15px;
          color: #576071;
          line-height: 1.5;
          max-width: 500px;
        }

        .section-hero-visual {
          /* Removed z-index to prevent stacking context isolation */
        }

        .illustration-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          width: 100%;
        }

        .illustration-glow {
          position: absolute;
          right: 20px;
          width: 220px;
          height: 220px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(68,140,116,0.15) 0%, rgba(68,140,116,0) 65%);
          z-index: 0;
        }

        .illustration-image {
          max-width: 280px;
          max-height: 200px;
          z-index: 1;
          margin-right: -10px;
          mix-blend-mode: darken; /* Or multiply, ensures white background becomes transparent against the gradient */
        }

        /* Mobile Adjustments */
        @media (max-width: 992px) {
          .section-hero-card {
            padding: 24px;
            flex-direction: column;
          }

          .section-hero-icon-container {
            width: 60px;
            height: 60px;
          }

          .section-hero-icon-container > svg {
            width: 28px;
            height: 28px;
          }

          .section-hero-title {
            font-size: 28px;
            text-align: center;
          }

          .section-hero-accent-line {
            margin: 0 auto 12px auto;
          }
          
          .section-hero-description {
            text-align: center;
          }

          .illustration-wrapper {
            justify-content: center;
          }

          .illustration-glow {
            right: auto;
          }

          .illustration-image {
            max-width: 180px;
            max-height: 140px;
            margin-right: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default SectionHero;
