import { toast } from "react-toastify";
import Link from "next/link";
import { parse, isValid } from "date-fns";



export const initialState = {
    isAuth: null,
    user: null,
    appName: 'SigmaValue - Creasophere Tech Private Limited',
    appTitle: ' | Sigmavalue | India’s leading AI-Driven Real Estate Intelligence & Valuation Ecosystem',
    apiHost: '/',
    theme: typeof window !== 'undefined' ? (localStorage?.getItem("theme") || 'light') : 'light',
    isMobile: typeof window !== 'undefined' ? window.innerWidth <= 768 : false,


    // home
    hmSearch: null,


    // Valuation
    valuationSearch: null,
    valuationResult: null,

    paymentData: null,


    // MMA
    searchForMicroList: null,
    selectionForMMA: null,
    selectionForMmaSt: null,
    resultForMicro: null,
    SelectionForMicro: null,
    resultForMicroSale: null,
    resultForMicroList: null,
    isMmaAllowed: null,
    rateTrendData: null,
    agreementPriceData: null,

    comparedBucketProjects: [],


    // Sale Transaction
    stSearch: null,
    hmStSearch: null,
    resultForSalTra: null,

    // Invest In Real Estate
    hmIipSearch: null,
    resultForIip: null,


    // Project Details
    resultForProjInfo: null,
    selectionForProjInfo: null,


    // R&D UI
    // Location Analysis
    searchForLocAnaList: null,
    resultForLocAnaList: null,
    selectionForLocAna: null,
    resultForLocAna: null,
    // Project Analysis
    searchForProjAna: null,
    resultForProjAna: null,
    searchForTopProjRates: null,
    resultForTopProjRates: null,

    // accessinfo
    accessInfo:null,
    
    // Map View
    selectedLocation: null,

};


export const setAlerts = (type_ = 'info', msg_ = 'Loading...') => {
    let toastOpts = {
        autoClose: 20000,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        toastId: msg_,
    };

    switch (type_) {
        case 'success':
            toast?.success(msg_, toastOpts);
            break;
        case 'error':
            toast?.error(msg_, toastOpts);
            break;
        case 'warning':
            toast?.warning(msg_, toastOpts);
            break;

        default:
            toast?.info(msg_, toastOpts);
            break;
    }
};


// const loadingReqs = [];

// export const loading = (act = true) => {
//     if (!window?.location?.origin?.includes('sigmavalue')) {
//         console.info(loadingReqs?.length, " - Loading: ", act);
//     }
//     // act && setAlerts("info", "Loading, Please wait...");
//     const preloader = document.getElementById('id_page_loading');

//     preloader?.classList?.contains('active') && preloader?.classList?.remove('active');

//     if (act) {
//         loadingReqs?.push(act);
//     } else {
//         loadingReqs?.pop();
//     }

//     if (loadingReqs?.length > 0) {
//         preloader?.classList?.add('active');
//     }
// }



const loadingReqs = [];

export const loading = (act = true) => {
    try {
        const preloader = document.getElementById('id_page_loading');
        
        if (!preloader) {
            console.error("Preloader element not found");
            return;
        }

        if (act) {
            loadingReqs.push(act);
        } else {
            if (loadingReqs.length > 0) {
                loadingReqs.pop();
            } else {
                console.warn("Loading stack underflow - more stops than starts");
            }
        }

        if (loadingReqs.length > 0) {
            preloader.classList.add('active');
        } else {
            preloader.classList.remove('active');
        }

        // console.log(`Loading state: ${loadingReqs.length > 0} (stack: ${loadingReqs.length})`);
    } catch (error) {
        console.error("Error in loading function:", error);
    }
}


export const setDocTheme = (theme = "light") => {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-bs-theme', theme);

    const themeSwitcher = document.querySelector('[data-bs-toggle="mode"]')

    if (!themeSwitcher) {
        return
    }

    const themeSwitcherCheck = themeSwitcher.querySelector('input[type="checkbox"]')

    if (theme === 'dark') {
        themeSwitcherCheck.checked = 'checked'
    } else {
        themeSwitcherCheck.checked = false
    }
}



export function toSentenceCase(string) {
    return string && string.slice(0, 1).toUpperCase() + string.slice(1);
}



export function toCapitalizeCase(text) {
    return text && text.replace(/\b\w/g, char => char.toUpperCase());
}

export function scrlTo(selector_str, scroll_at = 'center', behavior = 'smooth') {
    document?.querySelector(selector_str).scrollIntoView({
        behavior: behavior,
        block: scroll_at,
        inline: scroll_at
    });
}


// Url mainpulation utilities


export function sanitizeString(str) {
    return str.replace(/[^a-zA-Z0-9/_\- .)'']/g, '');
}


export function getDictToParamsUrl(baseUrl, paramsDict) {

    var nt = `${baseUrl}?`;
    Object.keys(paramsDict).forEach(ele => {
        nt += (ele + "=" + paramsDict[ele] + "&");
    });

    return nt;
}

export function getUrlParamsDict(search = null) {
    let params = new URLSearchParams(search ? search : window.location.search);
    const queryParams = {};
    for (const [key, value] of params.entries()) {

        const safeKey = sanitizeString(key);
        const safeValue = sanitizeString(value);

        if (safeValue === 'true') {
            queryParams[safeKey] = true;

        } else if (safeValue === 'false') {
            queryParams[safeKey] = false;

        } else if (!isNaN(safeValue)) {
            queryParams[safeKey] = parseFloat(safeValue);

        } else {
            queryParams[safeKey] = safeValue;
        }


    }

    return queryParams;
}


export const updateUrlParamsOnly = (newParamsDict) => {

    const searchParams = new URLSearchParams(window.location.search);

    Object.keys(newParamsDict).forEach(ele => {
        searchParams.set(ele, newParamsDict[ele]);
    });

    window.history.pushState({}, '', `${window.location.pathname}?${searchParams.toString()}`);
}

export const removeUrlParams = (newUrl = null) => {
    window.history.replaceState({}, '', newUrl ? newUrl : window?.location?.pathname);
}


export const refreshToken = (conType = 'application/json; charset=UTF-8', method = "POST") => {

    return {
        method,
        headers: {
            'Content-Type': conType,
            'X-CSRFToken': getCookie('csrftoken'),
        },
        body: null,
    }

}

export const isAuthenticated = async (APIHost = '/') => {

    try {
        const res_data = await get_data(`${APIHost}auth/user/verify/`, refreshToken('GET'));
        return "success" in res_data;

    } catch (err) {
        console.log("Authentication Check error: ", err);
    }
}



export async function get_data(url = '/', reqOptions = refreshToken()) {
    // loading(true);
    try {
        // !window?.location?.hostname?.toLowerCase().includes('sigmavalue') && console?.log("get_data:: url: ", url, "reqOptions: ", reqOptions);
        const res = await fetch(url, reqOptions);
        console.log("Response data res :" ,res)
        // console.log("Raw response : ", res.json())
        let data = null;
        try {
            if (res.status === 200) { 
                data = await res.json();
                console.log("Data from mma location :", data)
            } else {
                data = await res.text();
            }
        } catch (err) {
            setAlerts("error", "Something went wrong");
            if (!window?.location?.origin?.includes('sigmavalue')) {
                console.error("Url: ", url);
            }
            console.error("Error: ", err);
        }

        for (let i in data) {
            if (i === 'error') {
                setAlerts(i, `${data[i]}`);
            }
        }


        if (typeof data === "string") {
            // ("app util data:", data);
            return data?.includes("{") || data?.includes("[") ? JSON.parse(data) : data;
        } else {
            return data;
        }
    } catch (err) {
        setAlerts('error', `Something went wrong in data processing.`);

        if (!window?.location?.origin?.includes('sigmavalue')) {
            console.error("Url: ", url);
        }

        console.error("Data Collection Error: ", err);
    } finally {
        // loading(false);
    }
}



export function get_reponse(url = '/', reqOptions = refreshToken(), on_success = async () => { }, on_final = () => { }) {
    // loading(true);

    fetch(url, reqOptions)
        .then(async res => {
            let data = await res.json();

            for (let i in data) {
                setAlerts(i, `${toSentenceCase(i)}: ${data[i]}`);
                // loading(false);
            }

            if ((res.status === 200 || res.status === 201) && 'success' in data) {
                on_success();
            }

        }).catch(res => {
            setAlerts('error', `${res}`);
            // loading(false);
        }).finally(on_final);

}

export const getCookie = (name) => {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}


export const setCookie = (name, value, daysToExpire) => {
    const expires = new Date();
    expires.setDate(expires.getDate() + daysToExpire);

    const cookieString = `${name}=${value};expires=${expires.toUTCString()};path=/`;

    document.cookie = cookieString;
}

export const deleteCookie = (name) => {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

export const getGResult = (result) => {
    let ret = null;

    result.forEach(ele => {
        if (ele?.geometry.location_type === "ROOFTOP") {
            ret = ele;
        }
    });


    (ret === null) && result.forEach(ele => {
        if (ele?.geometry.location_type === "GEOMETRIC_CENTER") {
            ret = ele;
        }
    });


    (ret === null) && result.forEach(ele => {
        if (ele?.geometry.location_type === "RANGE_INTERPOLATED") {
            ret = ele;
        }
    });


    (ret === null) && result.forEach(ele => {
        if (ele?.geometry.location_type === "APPROXIMATE") {
            ret = ele;
        }
    });

    return ret ? ret : result[0];
}


export const getUsrAct = (path = "") => {

    let usr_reqs = JSON.parse(localStorage?.getItem("usr_reqs"));

    return (usr_reqs && path in usr_reqs) ? usr_reqs[path] : null;

}

export const saveUsrAct = (newAct = { "": "" }) => {

    localStorage?.setItem("usr_reqs", JSON.stringify({
        ...JSON.parse(localStorage?.getItem("usr_reqs")),
        ...newAct,
    }));

}


export const checkMmaAllowed = (setGState, prevIsMmaAllowed = null) => {

    get_data("/mma/canUserViewMMA").then(data => {
        // console.log("checkMmaAllowed:: data: ", data, "prevIsMmaAllowed: ", prevIsMmaAllowed);

        if (data && data?.userAllowed !== prevIsMmaAllowed) {
            if ([true, false].includes(data?.userAllowed)) {
                let mmaCheck = { isMmaAllowed: data?.userAllowed };
                if (data?.userAllowed) {
                    mmaCheck["isAuth"] = data?.userAllowed;
                }
                setGState(mmaCheck);
            } else {
                setGState({ isMmaAllowed: false });
            }
        }
    });
}


export const get_auth_and_usr = (setGState, onSuccess = () => { }) => {

    // loading();
    isAuthenticated().then((isAuth) => {
        if (isAuth === true) {
            get_data(`/auth/user/current/`, { ...refreshToken() })
                .then((user_data) => {
                    if (user_data && user_data.length > 0 && typeof user_data === 'object') {
                        user_data = user_data[0];

                        window.isAuth = isAuth;
                        window.user = user_data;
                        window.isMmaAllowed = null;

                        setGState({
                            isAuth: isAuth,
                            user: user_data,
                            isMmaAllowed: null,
                        });
                        onSuccess();
                    }
                    // loading(false);
                });
        } else {
            setGState({
                isAuth: isAuth,
            });
        }
    }).catch((err) => {
        console.error(err);
    }).finally(() => {
        // loading(false);
    });

}


// Sale Transactions common utilities..

export const formatPrice = (price) => {
    if (price >= 10000000) {
        return `${(price / 10000000).toFixed(2)} cr`;
    } else if (price >= 100000) {
        return `${(price / 100000).toFixed(2)} lakh`;
    } else {
        return `${price} approx`;
    }
};

export const formatDate = (dateString) => {

    if (!dateString) return "";

    const dateParts = dateString.split('-');
    if (dateParts.length !== 3) {
        // console.log("1. formatDate::dateString", dateString);
        return "Invalid Date";
    }

    const day = dateParts[0];
    const month = parseInt(dateParts[1], 10);
    const year = dateParts[2];

    const dateObj = new Date(`${year?.length === 4 ? year : day}-${month}-${day?.length === 2 ? day : year}`);

    if (isNaN(dateObj.getTime())) {
        // console.log("2. formatDate::dateString", dateString);
        return "Invalid Date";
    } else {
        return dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    }
};


export const formatNetCarpetArea = (area) => {
    if (typeof area !== 'number' || isNaN(area)) {
        return "N/A";
    }
    return Math.round(area);
};

// MMA Sale Transactions utilities...

export const handleDownloadPDF = async (pdfContent) => {
    loading();
    const newWindow = window.open('', '_blank');
    newWindow.document.write(pdfContent + '<center><button onClick="event.target.parentElement.style.display = \'none\'; window.print(); event.target.parentElement.style.display = \'block\';" style="background-color: #FF3562; padding: 10px 20px; margin: 0 10px; color: white; border-radius: 15px; font-weight: 500; cursor: pointer; border: none;"><b>Print / Save as PDF</b></button></center>');
    newWindow.document.close();
    loading(false);
};






// Valuation

export const makePayment = async (gState, setGState, amt = 19900, onSuccess = () => { }) => {

    const initializeRazorpay = () => {
        return new Promise((resolve) => {
            const script = document.createElement("script");
            script.src = "https://checkout.razorpay.com/v1/checkout.js";

            script.onload = () => {
                resolve(true);
            };
            script.onerror = () => {
                resolve(false);
            };

            document.body.appendChild(script);
        });
    };

    const res = await initializeRazorpay();

    if (!res) {
        setAlerts("error", "Razorpay Failed to load.");
        return;
    }

    // Make API call to the serverless API

    const bodyFile = {
        ...refreshToken(),
        body: JSON.stringify({ amt }),
    };

    const data = await get_data(
        "/mma/razorpayapi",
        bodyFile,
    );

    // (data);

    var options = {
        key: import.meta.env.VITE_RAZORPAY_KEY, // Enter the Key ID generated from the Dashboard
        name: "Sigmavalue - Creasophere Tech Private Limited",
        currency: data.currency,
        amount: data.amount,
        order_id: data.id,
        description: "Sigmavalue - Creasophere Tech Private Limited",
        image: "https://sigmavalue-all-media.s3.ap-south-1.amazonaws.com/Images/icon.png",
        handler: function (response) {
            // Validate payment at server - using webhooks is a better idea.
            // alert(response.razorpay_payment_id);
            // alert(response.razorpay_order_id);
            // alert(response.razorpay_signature);
            if (response.razorpay_payment_id) {
                setGState({
                    paymentData: response,
                });
                setAlerts("success", "Payment Successful..");
                onSuccess();
            } else {
                setAlerts("error", "Something went wrong.");
            }
        },

        prefill: gState?.user?.fields ? {
            name: gState?.user?.fields?.first_name ? `${gState?.user?.fields?.first_name} ${gState?.user?.fields?.last_name}` : "",
            email: gState?.user?.fields?.email ? gState?.user?.fields?.email : "",
            contact: gState?.user?.fields?.mobile_number ? gState?.user?.fields?.mobile_number : "",
        } : {
            name: "",
            email: "",
            contact: "",
        },

        theme: {
            color: "#448c74",
            hide_topbar: false,
        },
    };

    const paymentObject = new window.Razorpay(options);
    paymentObject.open();
};



export const getValData = (gState, setGState, setNextTo) => {

    const params = getUrlParamsDict();

    if ("stSelection" in params) {
        if ("valuationPaid" in gState) {
            if (!gState?.valuationPaid) {
                return
            }
        } else {
            return
        }
    }

    let body = gState?.valuationSearch ? gState?.valuationSearch : params;
    if (!gState?.valuationResult && body) {
        loading();

        const bodyFile = {
            ...refreshToken(),
            body: JSON.stringify(body),
        };

        get_data(
             `/api/result`,
            bodyFile
        ).then((parseRes) => {
            if (parseRes?.valuation !== "na") {
                setGState({
                    valuationSearch: body,
                    valuationResult: parseRes,
                });

            } else {
                setAlerts("error", "Requested data not recived...");
            }

        }).catch((err) => {
            setAlerts("error", "Valuation: Something went wrong.");
            console.error("Valuation Error: ", err);

        }).finally(() => {
            loading(false);
        });

    } else if (!body) {
        setAlerts("info", "Please search for property...");
        setNextTo("/valuation/");
    }

}


// export const getProjLatLngTf = (City, projName) => {
//     loading();
//     var latLngTf = null;

//     const bodyFile = {
//         ...refreshToken(),
//         body: JSON.stringify({ City, projName }),
//     };

//     get_data(
//         "/mma/getValProjLatLng",
//         bodyFile
//     ).then((data) => {
//         ("getProjLatLngTf:: data:", data);

//         if (data && data !== "N/A") {
//             latLngTf = data
//         } else {
//             latLngTf = {};
//         }

//     }).catch((err) => {

//         setAlerts("error", "Something went wrong in getting project details...");
//         ("getProjLatLng:: Error:", err);

//     }).finally(() => {
//         loading(false);
//     });

//     ("getProjLatLngTf:: latLngTf: ", latLngTf);

//     // while (latLngTf === null) {
//     //     if (latLngTf) {
//     //         return latLngTf;
//     //     }
//     // }

// }

export const getProjLatLngTf = async (City, projName) => {
    try {
        loading(true);

        const bodyFile = {
            ...refreshToken(),
            body: JSON.stringify({ City, projName }),
        };

        const data = await get_data(
            "/mma/getValProjLatLng",
            bodyFile
        );

        let latLngTf;
        if (data && data !== "N/A") {
            latLngTf = data;
        } else {
            latLngTf = {};
        }

        return latLngTf;
    } catch (err) {
        setAlerts("error", "Something went wrong in getting project details...");
        console.error("getProjLatLng:: Error:", err);
    } finally {
        loading(false);
    }
}

export const getDtCrd = (product, dt = null, index = null, props, gState) => {

    const shareOnWhatsApp = (projectDetails) => {
        let encodedText = encodeURIComponent(projectDetails);
        let shareUrl = gState?.isMobile ? `whatsapp://send?text=${encodedText}` : `https://web.whatsapp.com/send?text=${encodedText}`;
        window.open(shareUrl, '_blank');
    };

    const shareOnGmail = (projectDetails) => {
        let subject = encodeURIComponent("Check out this property on SigmaValue.in");
        let body = encodeURIComponent(`I found this property and thought you might be interested: ${projectDetails}`);
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
    };

    const shareOnFacebook = (projectDetails) => {
        let post = encodeURIComponent(`${projectDetails}`);
        const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${post}`;
        window.open(shareUrl, '_blank');
    };

    let ret = null;
    let projectDetails = "N/A";

    if (dt && index !== null) {
        projectDetails = `Check out this property on SigmaValue.in: Project: ${dt['Project_name_Selected'][index]}, Village: ${dt['IGR_Village'][index]}, Date: ${formatDate(dt['Transaction_Date'][index])}, Price: ${formatPrice(dt['Agreement_Price_INR'][index])}, Floor: ${dt['Floor_No'][index]}. For More Details: ${window?.location?.href}`;

        const mobileClass = gState?.isMobile ? 'mobile ' : '';
        ret = (
            <div className={`card bg-dark bg-opacity-10 p-0 ${gState?.isMobile ? 'd-flex' : ''}`} style={{ borderRadius: "0.5rem" }}>
                <b className="card-header row text-primary border-primary my-0 pb-0">
                    <div className="col my-auto">
                        <i className={`bi bi-house-door fs-4 fg-primary ${gState?.isMobile ? 'fs-1' : ''}`}></i><span className='fs-4'> {(dt['Project_name_Selected'] && dt['Project_name_Selected'][index]) ? (<span style={{ fontSize: gState?.isMobile ? '1rem' : 'inherit' }}>{dt['Project_name_Selected'][index]}</span>) : "N/A"}</span>,<span className='form-text'> {(dt['IGR_Village'] && dt['IGR_Village'][index]) ? (<span style={{ fontSize: gState?.isMobile ? '0.7rem' : 'inherit' }}>{dt['IGR_Village'][index]}</span>) : "N/A"}</span>
                    </div>
                </b>
                <div className="card-body row justify-content-between py-3">
                    <div className="col my-auto">
                        <h6 className={`card-title  ${mobileClass}`} style={{ fontSize: gState?.isMobile ? '0.6rem' : 'inherit' }}>
                            {(dt['Transaction_Date'] && dt['Transaction_Date'][index]) ? (<span>{formatDate(dt['Transaction_Date'][index])}</span>) : "N/A"}
                        </h6>
                        <p className="form-text" style={{ fontSize: gState?.isMobile ? '0.5rem' : 'inherit' }}>Date</p>
                    </div>
                    <div className="col my-auto">
                        <h6 className={`card-title  ${mobileClass}`} style={{ fontSize: gState?.isMobile ? '0.6rem' : 'inherit' }}>
                            {(dt['Agreement_Price_INR'] && dt['Agreement_Price_INR'][index]) ? (<span>{formatPrice(dt['Agreement_Price_INR'][index])}</span>) : "N/A"}
                        </h6>
                        <p className="form-text" style={{ fontSize: gState?.isMobile ? '0.5rem' : 'inherit' }}>Price</p>
                    </div>
                    <div className="col my-auto">
                        <h6 className={`card-title  ${mobileClass}`} style={{ fontSize: gState?.isMobile ? '0.6rem' : 'inherit' }}>
                            {(dt['Floor_No'] && dt['Floor_No'][index]) ? (<span>{dt['Floor_No'][index]}</span>) : "N/A"}
                        </h6>
                        <p className="form-text" style={{ fontSize: gState?.isMobile ? '0.5rem' : 'inherit' }}>Floor</p>
                    </div>
                    <div className="col my-auto">
                        <h6 className="card-title " style={{ fontSize: gState?.isMobile ? '0.6rem' : 'inherit' }}>
                            {(dt['Transaction_Rate_Per_Sq_ft_on_C_A'] && dt['Transaction_Rate_Per_Sq_ft_on_C_A'][index]) ? (
                                <span>{Math.floor(dt['Transaction_Rate_Per_Sq_ft_on_C_A'][index])}</span>
                            ) : "N/A"}
                        </h6>
                        <p className="form-text" style={{ fontSize: gState?.isMobile ? '0.5rem' : 'inherit' }}>Rate/sqft(INR)</p>
                    </div>
                    <div className="col my-auto">
                        <h6 className={`card-title  ${mobileClass}`} style={{ fontSize: gState?.isMobile ? '0.6rem' : 'inherit' }}>
                            {(dt['Unit_No'] && dt['Unit_No'][index]) ? (<span>{dt['Unit_No'][index]}</span>) : "N/A"}
                        </h6>
                        <p className="form-text" style={{ fontSize: gState?.isMobile ? '0.5rem' : 'inherit' }}>Unit</p>
                    </div>
                    <div className="col my-auto">
                        <h6 className={`card-title  ${mobileClass}`} style={{ fontSize: gState?.isMobile ? '0.6rem' : 'inherit' }}>
                            {(dt['Net_Carpet_Area_sqmt_KHESTRAFAL'] && dt['Net_Carpet_Area_sqmt_KHESTRAFAL'][index]) ? (<span>{formatNetCarpetArea(dt['Net_Carpet_Area_sqmt_KHESTRAFAL'][index] * 10.764)} sqft</span>) : "N/A"}
                        </h6>
                        <p className="form-text" style={{ fontSize: gState?.isMobile ? '0.5rem' : 'inherit' }}>Net Carpet Area (sqft)</p>
                    </div>
                    <div className="col my-auto">
                        <h6 className="card-title " style={{ fontSize: gState?.isMobile ? '0.6rem' : 'inherit' }}>
                            {(dt['Transaction_Type'] && dt['Transaction_Type'][index]) ? (<span>{dt['Transaction_Type'][index]}</span>) : "N/A"}
                        </h6>
                        <p className="form-text" style={{ fontSize: gState?.isMobile ? '0.5rem' : 'inherit' }}>Document Type</p>
                    </div>
                    {/* <div className="col my-auto">
                        <h6 className="card-title " style={{ fontSize: isMobile ? '0.6rem' : 'inherit' }}>N/A</h6>
                        <p className="form-text" style={{ fontSize: isMobile ? '0.5rem' : 'inherit' }}>Tower Name</p>
                    </div> */}
                    <div className="col my-auto">
                        <h6 className="card-title">
                            <Link className="btn btn-sm btn-outline-success" to={getDictToParamsUrl(`/contact/`, {
                                msg: `Request for following Index II-    Project Name) ${dt['Project_name_Selected'][index] || "N/A"},    Date) ${dt['Transaction_Date'][index] || "N/A"}    Unit) ${dt['Unit_No'][index] || "N/A"}    Price) ${dt['Agreement_Price_INR'][index] ? formatPrice(dt['Agreement_Price_INR'][index]) : "N/A"}    Floor) ${dt['Floor_No'][index] || "N/A"}    Rate/sqft(INR)) ${dt['Transaction_Rate_Per_Sq_ft_on_C_A'][index] ? Math.round(dt['Transaction_Rate_Per_Sq_ft_on_C_A'][index] / 1000) * 1000 : "N/A"}    Net Carpet Area (sqft)) ${dt['Net_Carpet_Area_sqmt_KHESTRAFAL'][index] || "N/A"} sqft    Document Type) ${dt['Transaction_Type'][index] || "N/A"}`,
                                page: `${window?.location?.pathname}`,
                            })}>
                                Request Index II
                            </Link>
                        </h6>
                    </div>
                    <div className="col my-auto">
                        <h6 className="card-title">
                            <button className="btn btn-sm btn-outline-success" data-bs-toggle="modal" data-bs-target={`#shareModal${index}`} style={{ borderRadius: "0.5rem" }}>
                                <i className="ai-share fg-primary mx-1"></i> Share
                            </button>
                        </h6>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            {ret}
            <div className="modal fade" id="indexiiModal" tabIndex="-1" aria-labelledby="indexiiModalLabel" aria-hidden="true">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header">
                            <button type="button" id="indexiiModal_close" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div className="modal-body">
                            <div className="card border-primary h-100 py-lg-3" style={{ maxWidth: "26rem" }}>
                                <div className="card-body w-100 mx-auto" style={{ maxWidth: "21rem" }}>
                                    <div className="d-flex align-items-center border-2 border-primary border-bottom pb-4 mb-4">
                                        <div className="ps-3">
                                            <h3 className="h4 text-primary mb-0">Download Index II PDF</h3>
                                            <div className="d-flex align-items-center">
                                                <span className="h5 mb-1 me-1">₹</span>
                                                <span className="h2 mb-0">45</span>
                                            </div>
                                        </div>
                                    </div>
                                    <ul className="list-unstyled mb-1 pb-4">
                                        <li className="d-flex pb-1 mb-2">
                                            <i className="ai-check fs-xl mt-1 me-2"></i>
                                            Get Access to Balcony area, Terrace area and Parking Area
                                        </li>
                                        <li className="d-flex pb-1 mb-2">
                                            <i className="ai-check fs-xl mt-1 me-2"></i>
                                            Government value / Circle rate
                                        </li>
                                        <li className="d-flex pb-1 mb-2">
                                            <i className="ai-check fs-xl mt-1 me-2"></i>
                                            Stamp Duty
                                        </li>
                                    </ul>
                                    {/* <button type="button" className="btn btn-primary w-100" onClick={handleGetIndexII} style={{ borderRadius: "0.5rem" }}>
                                        {gState?.isAuth ? "Download" : "Continue to SignIn and Download"}
                                    </button> */}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="modal modal-xl fade" id={`shareModal${index}`} tabIndex="-1" aria-labelledby="shareModalLabel" aria-hidden="true">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title" id="shareModalLabel">Share Property</h5>
                            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <center className="modal-body row justify-content-between">
                            <center className='col'>
                                <button className="btn btn-sm btn-outline-success d-flex justify-content-between m-2" onClick={() => shareOnWhatsApp(projectDetails)} style={{ borderRadius: "0.5rem" }}>
                                    <i className="ai-whatsapp fs-2 fg-primary mx-1"></i> Share on WhatsApp
                                </button>
                            </center>
                            <center className='col'>
                                <button className="btn btn-sm btn-outline-success d-flex justify-content-between m-2" onClick={() => shareOnGmail(projectDetails)} style={{ borderRadius: "0.5rem" }}>
                                    <i className="ai-mail-filled fs-2 fg-primary mx-1"></i> Share via Gmail
                                </button>
                            </center>
                            <center className='col'>
                                <button className="btn btn-sm btn-outline-success d-flex justify-content-between m-2" onClick={() => shareOnFacebook(projectDetails)} style={{ borderRadius: "0.5rem" }}>
                                    <i className="ai-facebook fs-2 fg-primary mx-1"></i> Share on Facebook
                                </button>
                            </center>
                        </center>
                    </div>
                </div>
            </div>
        </>
    );
};




// MMA Apex Dashboard Agreement price data fetching for all 5 graphs
export function arraysEqual(arr1, arr2) {

    if (!arr1) return false;
    if (!arr2) return false;

    // Check if both arrays are of same length
    if (arr1.length !== arr2.length) return false;

    // Compare each element
    for (let i = 0; i < arr1.length; i++) {
        if (!(arr2.includes(arr1[i]))) return false;
    }

    return true;
}


export const getAgrPrcData = async (dataRes_, projIndexes, graphName, searchForAnalytics, agreementPriceData, setGState, setIsLoading = () => { }) => {
    setIsLoading(true);
    loading(true);

    try {
        const bodyFile = {
            ...refreshToken(),
            body: JSON.stringify({ ...searchForAnalytics, selection: projIndexes, trialLink: window?.location?.pathname?.includes("/analysis/trial/v4/"), }),
        };

        let dataRes;
        if (agreementPriceData && (arraysEqual(projIndexes, agreementPriceData?.ProjName) || (dataRes_ && !arraysEqual(agreementPriceData?.ProjName, dataRes_?.ProjName)))) {
            dataRes = agreementPriceData;

        } else if (!dataRes_ || (dataRes_ && !arraysEqual(projIndexes, dataRes_?.ProjName))) {
            const dataRes_ = await get_data(`/mma/getGraphWiseData/agreementpriceanalysis/`, bodyFile);
            setGState({
                agreementPriceData: dataRes_,
            });
            dataRes = dataRes_;

        }

        return dataRes;


    } catch (error) {
        console.error(`Error fetching ${graphName} data: `, error);
        setAlerts("error", graphName + ": Something went wrong.");
    } finally {
        setIsLoading(false);
        loading(false);
    }
};



// Utility Function: Parse Date
export const parseDate = (dateInput) => {
    const formats = ["yyyy-MM-dd", "dd-MM-yyyy"];
    if (typeof dateInput === "number") {
        return new Date(dateInput);

    } else if (typeof dateInput === "string") {

        if (Array.isArray(formats)) {
            for (let fmt of formats) {
                const parsed = parse(dateInput, fmt, new Date());
                if (isValid(parsed)) return parsed;
            }
        } else {
            // ("parseDate::formats", formats);

            const parsed = formats && parse(dateInput, formats, new Date());
            if (isValid(parsed)) return parsed;
        }

        return null;

    } else if (dateInput instanceof Date) {
        return isValid(dateInput) ? dateInput : null;
    }
    return null;
};



// Search Utility...

export class TrieNode {
    constructor() {
        this.children = {};
        this.isEndOfWord = false;
        this.projects = []; // Store full matches at each node
    }
}

export class Trie {
    constructor() {
        this.root = new TrieNode();
    }

    insert(name, project) {
        let node = this.root;
        for (let char of name.toLowerCase()) {
            if (!node.children[char]) {
                node.children[char] = new TrieNode();
            }
            node = node.children[char];
            node.projects.push(project); // Store project at each node
        }
        node.isEndOfWord = true;
    }

    search(prefix) {
        let node = this.root;
        for (let char of prefix.toLowerCase()) {
            if (!node.children[char]) return [];
            node = node.children[char];
        }
        return node.projects.slice(0, 10); // Limit results for performance
    }
}



export function escapeHtml(str) {
    return str.replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}



export async function fetchLocationDetails(
  city,
  sheetName,
  columns = null, // optional → [] or null
  village = null // optional → string or null
) {
  /* ---------- basic validation ---------- */

    if (!sheetName) {
        // console.log("city, village,sheetName", city, village,sheetName)
        console.error(
            "fetchLocationDetails: 'city' and 'sheetName' are required arguments."
        );
        throw new Error("City and sheetName are required");
        
    }

  /* ---------- build request body ---------- */
  const requestData = {
    City: city,
    sheetName: sheetName,
  };

  // include columns only if caller provided a non‑empty array
  if (Array.isArray(columns) && columns.length) {
    requestData.columns = columns;
  }

  // include village only if caller provided a truthy string
  if (typeof village === "string" && village.trim()) {
    requestData.village = village.trim();
  }

  /* ---------- make the request ---------- */
  try {
    const data = await get_data("/mma/mmalocationanalysissummary/", {
      ...refreshToken(),
      body: JSON.stringify(requestData),
    });

    if (data?.error) {
      console.error("Error in Location Data Response:", data.error);
      throw new Error(data.error);
    }

    return data;
  } catch (err) {
    console.error("Error fetching location details:", err);
    throw new Error("An error occurred while fetching location details.");
  }
}


export async function fetchDevlopmentAgreement(city, vlg = null, data_for = null) {
    if (!city) {
        console.error("fetchLocationDetails: City is required.");
        throw new Error("City is required");
    }
    const requestData = { City: city, Village: vlg, data_for };

    try {
        const data = await get_data((vlg && data_for ? "/mma/mmadevelopmentagreement/" + data_for + "/" : "/mma/mmadevelopmentagreement/"), {
            ...refreshToken(),
            body: JSON.stringify(requestData),
        });
        if (data?.error) {
            console.error("Error in Location Data Response:", data.error);
            throw new Error(data.error);
        }
        return data;
    } catch (err) {
        console.error("Error fetching location details:", err);
        throw new Error("An error occurred while fetching location details.");
    }
}

export async function fetchProjectWiseGrandSummary(city,
    columns = null,   // optional → [] or null
    village = null    // optional → string or null
) {
    /* ---------- basic validation ---------- */
    if (!city) {
        console.error(
            "fetchLocationDetails: 'city' and 'sheetName' are required arguments."
        );
        throw new Error("City and sheetName are required");
    }

    /* ---------- build request body ---------- */
    const requestData = {
        City: city,
    };

    // include columns only if caller provided a non‑empty array
    if (Array.isArray(columns) && columns.length) {
        requestData.columns = columns;
    }

    // include village only if caller provided a truthy string
    if (typeof village === "string" && village.trim()) {
        requestData.village = village.trim();
    }

    /* ---------- make the request ---------- */
    try {
        // console.log("requestData: ", requestData);

        const data = await get_data("/mma/projectwisegrandsummary/", {
            ...refreshToken(),
            body: JSON.stringify(requestData),
        });

        if (data?.error) {
            console.error("Error in Location Data Response:", data.error);
            throw new Error(data.error);
        }

        return data;
    } catch (err) {
        console.error("Error fetching location details:", err);
        throw new Error("An error occurred while fetching location details.");
    }
}


export async function fetchRearSummary(city, vlg = null, data_for = null) {
    if (!city) {
        console.error("fetchRearSummary: City is required.");
        throw new Error("City is required");
    }
    const requestData = { City: city, Village: vlg, data_for };

    try {
        const data = await get_data(
            (vlg && data_for ? "/mma/mmarerasummary/" + data_for + "/" : "/mma/mmarerasummary/"), {
            ...refreshToken(),
            body: JSON.stringify(requestData),
        }
        );
        if (data?.error) {
            console.error("Error in Location Data Response:", data.error);
            throw new Error(data.error);
        }
        return data;
    } catch (err) {
        console.error("Error fetching location details:", err);
        throw new Error("An error occurred while fetching location details.");
    }
}



// Only for location wise analysis MMA
export const formatArea1 = (area) => {
    if (area >= 10000000) {
        return `${(area / 10000000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} cr sqft`;
    } else if (area >= 100000) {
        return `${(area / 100000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} lakh sqft`;
    } else if (area >= 1000) {
        return `${(area / 1000).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} k sqft`;
    } else {
        return `${area.toLocaleString('en-IN')} sqft`;
    }
};



export const formatNumber = (number) => {
    if (number >= 10000000) {
        return `${(number / 10000000).toFixed(2)} cr`;
    } else if (number >= 100000) {
        return `${(number / 100000).toFixed(2)} lakh`;
    } else if (number >= 1000) {
        return `${(number / 1000)} k`;
    } else {
        return `${number}`;
    }
};


export const formatPrice1 = (price) => {
    price = Math.floor(price); // Ensuring price is an integer

    if (price >= 10000000) {
        return `₹ ${Math.round(price / 10000000)} Cr`;
    } else if (price >= 100000) {
        return `₹ ${Math.round(price / 100000)} lakh`;
    } else {
        return `₹ ${price.toLocaleString("en-IN")}`;
    }
};
