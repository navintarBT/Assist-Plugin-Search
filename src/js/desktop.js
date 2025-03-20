jQuery.noConflict();
(async function ($, Swal10, PLUGIN_ID, kintone) {
  "use strict";

  // Configuration handling with error boundary
  let CONFIG;
  try {
    const configData = kintone.plugin.app.getConfig(PLUGIN_ID).config;
    if (!configData) {
      console.warn("No configuration found for plugin:", PLUGIN_ID);
      return;
    }
    CONFIG = JSON.parse(configData);
  } catch (error) {
    console.error("Error parsing plugin configuration:", error);
    return;
  }

  function parseDate(input) {
    if (!input || typeof input !== "string") return null;

    const currentYear = new Date().getFullYear();
    const formats = [
      {
        regex: /^\d{8}$/,
        parse: (s) => `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6)}`,
      },
      {
        regex: /^\d{6}$/,
        parse: (s) => `20${s.slice(0, 2)}-${s.slice(2, 4)}-${s.slice(4)}`,
      },
      {
        regex: /^\d{4}$/,
        parse: (s) => `${currentYear}-${s.slice(0, 2)}-${s.slice(2, 4)}`,
      },
      {
        regex: /^(\d{4})\s+(\d{1,2})\s+(\d{1,2})$/,
        parse: (s) => {
          const [year, month, day] = s.split(/\s+/);
          return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        },
      },
      {
        regex: /^(\d{2})\s+(\d{1,2})\s+(\d{1,2})$/,
        parse: (s) => {
          const [year, month, day] = s.split(/\s+/);
          return `${currentYear.toString().slice(0, 2) + year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        },
      },
      {
        regex: /^(\d{1,2})\s+(\d{1,2})$/,
        parse: (s) => {
          const [month, day] = s.split(/\s+/);
          return `${currentYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        },
      },
      {
        regex: /^(\d{2})\/(\d{2})\/(\d{4})$/,
        parse: (s) =>
          `${s.split("/")[2]}-${s.split("/")[0].padStart(2, "0")}-${s.split("/")[1].padStart(2, "0")}`,
      },
      {
        regex: /^(\d{2})(\d{2})(\d{4})$/,
        parse: (s) => `${s.slice(4, 8)}-${s.slice(0, 2)}-${s.slice(2, 4)}`,
      },
      {
        regex: /^(\d{2})\/(\d{2})$/,
        parse: (s) => `${currentYear}-${s.split("/")[0]}-${s.split("/")[1]}`,
      },
      {
        regex: /^(\d{2})\/(\d{1})$/,
        parse: (s) =>
          `${currentYear}-${s.split("/")[0]}-${s.split("/")[1].padStart(2, "0")}`,
      },
      {
        regex: /^R(\d{2})(\d{4})$/,
        parse: (s) =>
          `${2018 + parseInt(s.slice(1, 3))}-${s.slice(3, 5)}-${s.slice(5)}`,
      },
      {
        regex: /^(\d{4})(\d{1})(\d{1})$/,
        parse: (s) =>
          `${s.slice(0, 4)}-${s.slice(4, 5).padStart(2, "0")}-${s.slice(5).padStart(2, "0")}`,
      },
    ];

    // Add Japanese era format parsing
    const japaneseDate = parseJapaneseDate(input);
    if (japaneseDate) return japaneseDate;

    // Check other formats
    for (let { regex, parse } of formats) {
      if (regex.test(input)) {
        const parsed = parse(input);
        const [year, month, day] = parsed.split("-").map(Number);
        if (
          year >= 1900 &&
          year <= 9999 &&
          month >= 1 &&
          month <= 12 &&
          day >= 1 &&
          day <= 31
        ) {
          return parsed;
        }
      }
    }
    return null;
  }

  function parseJapaneseDate(input) {
    if (window.BoK) {
      if (!window.BoK.Constant.JpCalenderBase) return false;
    } else {
      return false;
    }
    const JP_CALENDAR = window.BoK.Constant.JpCalenderBase.sort(
      (a, b) => new Date(a[0]) - new Date(b[0])
    );

    // Case-insensitive regex with optional space and optional month/day
    const regex = /^([tm shr])\s?(\d{1,2})(?:\s+(\d{1,2})(?:\s+(\d{1,2}))?)?$/i;
    const match = input.trim().match(regex);

    if (!match) return null;

    const [, eraAbbr, yearStr, monthStr = "1", dayStr = "1"] = match;
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);

    if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) {
      return null;
    }

    const eraInfo = JP_CALENDAR.find(
      ([_, __, abbr]) => abbr.toLowerCase() === eraAbbr.toLowerCase()
    );
    if (!eraInfo) return null;

    const [eraStartDate] = eraInfo;
    const [startYear] = eraStartDate.split("-").map(Number);
    const gregorianYear = startYear + year - 1;

    const date = new Date(gregorianYear, month - 1, day);
    if (
      date.getFullYear() !== gregorianYear ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    return `${gregorianYear}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
  }

  function formatDate(dateString, format) {
    if (!dateString) return "";
    const [year, month, day] = dateString.split("-");
    switch (format) {
      case "YYYY-MM-DD":
        return `${year}-${month}-${day}`;
      case "YYYY/MM/DD":
        return `${year}/${month}/${day}`;
      case "YYYY.MM.DD":
        return `${year}.${month}.${day}`;
      case "YY/MM/DD":
        return `${year.slice(2)}/${month}/${day}`;
      case "YY.MM.DD":
        return `${year.slice(2)}.${month}.${day}`;
      case "eYY-MM-DD":
        return `e${year.slice(2)}-${month}-${day}`;
      case "eYY/MM/DD":
        return `e${year.slice(2)}/${month}/${day}`;
      default:
        console.warn(`Unsupported format: ${format}, defaulting to YYYY-MM-DD`);
        return `${year}-${month}-${day}`;
    }
  }

  // Create and Edit page handler
  kintone.events.on(
    ["app.record.create.show", "app.record.edit.show"],
    function (event) {
      CONFIG.formatSetting.forEach((item) => {
        console.log(item);

        if (item.type !== "DATE" || !item.storeField?.code || !item.space)
          return;

        kintone.app.record.setFieldShown(item.storeField.code, false);
        const spaceElement = kintone.app.record.getSpaceElement(item.space);
        if (!spaceElement) {
          console.warn(`Space ${item.space} not found`);
          return;
        }

        const labelField = document.createElement("label");
        labelField.textContent = item.storeField.label || "Date";
        labelField.className = "label_date_format";

        const inputBoxDate = document.createElement("input");
        inputBoxDate.className = "kintoneplugin-input-text date-input";
        inputBoxDate.type = "text";
        inputBoxDate.placeholder = "";

        // Set initial or existing value
        const existingValue = event.record[item.storeField.code]?.value;
        if (event.type === "app.record.edit.show" && existingValue) {
          inputBoxDate.value = formatDate(existingValue, item.format);
        } else if (
          event.type === "app.record.create.show" &&
          item.initialValue
        ) {
          const initialOffset = parseInt(item.initialValue) || 0;
          const date = new Date();
          date.setDate(date.getDate() + initialOffset);
          const dateString = date.toISOString().split("T")[0];
          inputBoxDate.value = formatDate(dateString, item.format);
          event.record[item.storeField.code].value = dateString;
        }

        const spacePopupAlert = document.createElement("div");
        spacePopupAlert.className = "popup-alert";
        spacePopupAlert.textContent = "Invalid date format.";
        spacePopupAlert.style.display = "none";

        inputBoxDate.addEventListener("change", (e) => {
          const record = kintone.app.record.get();
          const input = e.target.value.trim();

          if (input === "") {
            // Empty input is allowed, hide alert
            spacePopupAlert.style.display = "none";
            record.record[item.storeField.code].value = null;
          } else {
            const parsedDate = parseDate(input);
            if (parsedDate) {
              // Correct date format detected, hide alert and format the date
              const formattedDate = formatDate(parsedDate, item.format);
              e.target.value = formattedDate;
              record.record[item.storeField.code].value = parsedDate;
              spacePopupAlert.style.display = "none";
            } else {
              // Incorrect date format, show alert
              spacePopupAlert.style.display = "block";
              record.record[item.storeField.code].value = null;
            }
          }

          kintone.app.record.set(record);
        });

        spaceElement.appendChild(labelField);
        spaceElement.appendChild(inputBoxDate);
        spaceElement.appendChild(spacePopupAlert);
        spaceElement.appendChild(document.createElement("br"));
      });
      return event;
    }
  );

  // Index page handler
  kintone.events.on("app.record.index.show", function (event) {
    if (!CONFIG?.formatSetting?.length) return event;
    const schemaPage = cybozu.data.page.SCHEMA_DATA;
  
    const tableLabel = schemaPage.table.fieldList;
    console.log("🚀 ~ schemaPage:", tableLabel);
  
    tableLabel.forEach((item) => {
      console.log("🚀 ~ item:", item.label);
    });

    // Format regular date fields
    CONFIG.formatSetting.forEach((item) => {
      if (item.type !== "DATE" || !item.storeField?.code) return;
  
      // Handle regular fields
      const fieldElement = kintone.app.record.getFieldElement(
        item.storeField.code
      );
      
      console.log("fieldElement", fieldElement);
      
      if (fieldElement && event.record[item.storeField.code]?.value) {
        const formattedDate = formatDate(
          event.record[item.storeField.code].value,
          item.format
        );
        fieldElement.textContent = formattedDate;
      }
      
    });
    
    return event;
  });

  // Detail page handler
  kintone.events.on("app.record.detail.show", function (event) {
    if (!CONFIG?.formatSetting?.length) return event;

    CONFIG.formatSetting.forEach((item) => {
      if (item.type !== "DATE" || !item.storeField?.code) return;

      const fieldElement = kintone.app.record.getFieldElement(
        item.storeField.code
      );      
      
      if (fieldElement && event.record[item.storeField.code]?.value) {
        const formattedDate = formatDate(
          event.record[item.storeField.code].value,
          item.format
        );
        fieldElement.textContent = formattedDate;
      }
    });
    return event;
  });

  // Submit validation handler
  kintone.events.on(
    ["app.record.create.submit", "app.record.edit.submit"],
    function (event) {
      const popupAlerts = document.querySelectorAll(".popup-alert");
      for (const alert of popupAlerts) {
        if (alert.style.display === "block") {
          event.error = "Invalid date format detected.";
          return event;
        }
      }
      return event;
    }
  );

  // Config submit handler
  // kintone.events.on("app.record.index.edit.submit", function (event) {
  //   const config = [];
  //   $("#kintoneplugin-setting-tspace tr").each(function () {
  //     const $row = $(this);
  //     if (!$row.is(":first-child")) {
  //       const item = {
  //         type: $row.find("#type").val(),
  //         space: $row.find("#space").val(),
  //         storeField: { code: $row.find("#store_field").val() },
  //         format: $row.find("#format").val(),
  //         initialValue: $row.find("#initial_value").val() || "0",
  //       };
  //       if (item.type && item.space && item.storeField.code && item.format) {
  //         config.push(item);
  //       }
  //     }
  //   });
  //   return {
  //     ...event,
  //     config: JSON.stringify({ formatSetting: config }),
  //   };
  // });
})(jQuery, Sweetalert2_10.noConflict(true), kintone.$PLUGIN_ID, kintone);
