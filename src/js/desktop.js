jQuery.noConflict();
(async function ($, Swal10, PLUGIN_ID) {
  "use strict";

  let CONFIG = kintone.plugin.app.getConfig(PLUGIN_ID).config;
  if (!CONFIG) return;
  CONFIG = JSON.parse(CONFIG);

  function getAdjustedDate(offset) {
    if (!offset) return "";
    const date = new Date();
    date.setDate(date.getDate() + Number(offset));
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function getJapaneseEra(date) {
    if (!window.BoK?.Constant?.JpCalenderBase) return false;

    const JP_CALENDAR = window.BoK.Constant.JpCalenderBase.sort(
      (a, b) => new Date(a[0]) - new Date(b[0])
    );

    let eraSymbol = "";
    let eraStartYear = 0;
    let eraStartDate = null;

    for (let i = JP_CALENDAR.length - 1; i >= 0; i--) {
      const [startDateStr, , symbol] = JP_CALENDAR[i];
      const startDate = new Date(startDateStr);

      if (date >= startDate) {
        eraSymbol = symbol;
        eraStartYear = date.getFullYear() - startDate.getFullYear() + 1;
        eraStartDate = startDate;
        break;
      }
    }

    if (!eraSymbol) return false;

    const customYear = String(eraStartYear).padStart(2, "0");
    const eraYear = date.getFullYear();
    const eraMonth = String(date.getMonth() + 1).padStart(2, "0");
    const eraDay = String(date.getDate()).padStart(2, "0");

    return {
      eraSymbol,
      customYear,
      formattedDate: `${eraYear}-${eraMonth}-${eraDay}`,
    };
  }

  async function convertJapaneseEraToDate(eraInput) {
    if (!window.BoK?.Constant?.JpCalenderBase) return false;

    const JP_CALENDAR = window.BoK.Constant.JpCalenderBase.sort(
      (a, b) => new Date(a[0]) - new Date(b[0])
    );

    let eraSymbol, customYear, month, day;
    if (/^[A-Za-z]\d{2}\.\d{2}\.\d{2}$/.test(eraInput)) {
      [, eraSymbol, customYear, month, day] = eraInput.match(
        /^([A-Za-z])(\d{2})\.(\d{2})\.(\d{2})$/
      );
    } else if (/^[A-Za-z]\d{6}$/.test(eraInput)) {
      [, eraSymbol, customYear, month, day] = eraInput.match(
        /^([A-Za-z])(\d{2})(\d{2})(\d{2})$/
      );
    } else if (/^[A-Za-z]\s+\d{1,2}\s+\d{1,2}\s+\d{1,2}$/.test(eraInput)) {
      [eraSymbol, customYear, month, day] = eraInput.split(/\s+/);
    } else {
      return false;
    }

    customYear = parseInt(customYear);
    month = parseInt(month);
    day = parseInt(day);

    if (isNaN(customYear) || isNaN(month) || isNaN(day)) return false;

    const eraData = JP_CALENDAR.find(
      ([_, __, symbol]) => symbol.toUpperCase() === eraSymbol.toUpperCase()
    );
    if (!eraData) return false;

    const eraStartDate = new Date(eraData[0]);
    const year = eraStartDate.getFullYear() + customYear - 1;

    if (month < 1 || month > 12 || day < 1 || day > 31) return false;

    return {
      year: String(year),
      month: String(month).padStart(2, "0"),
      day: String(day).padStart(2, "0"),
    };
  }

  async function parseDate(input) {
    if (!input) return getAdjustedDate(0);
    const currentYear = new Date().getFullYear();
    const pad = (num) => String(num).padStart(2, "0");
    const isValidDate = (y, m, d) => {
      const date = new Date(y, m - 1, d);
      return (
        date.getFullYear() === y &&
        date.getMonth() + 1 === m &&
        date.getDate() === d
      );
    };

    let year, month, day;
    if (/^\d{8}$/.test(input)) {
      year = parseInt(input.slice(0, 4));
      month = parseInt(input.slice(4, 6));
      day = parseInt(input.slice(6, 8));
    } else if (/^\d{6}$/.test(input)) {
      year = parseInt(input.slice(0, 2)) + 2000;
      month = parseInt(input.slice(2, 4));
      day = parseInt(input.slice(4, 6));
    } else if (/^\d{4}$/.test(input)) {
      year = currentYear;
      month = parseInt(input.slice(0, 2));
      day = parseInt(input.slice(2, 4));
    } else if (/^\d{1,2}\/\d{1,2}$/.test(input)) {
      [month, day] = input.split("/").map(Number);
      year = currentYear;
    } else if (/^\d{4}\s+\d{1,2}\s+\d{1,2}$/.test(input)) {
      [year, month, day] = input.split(/\s+/).map(Number);
    } else if (/^\d{2}\s+\d{1,2}\s+\d{1,2}$/.test(input)) {
      [year, month, day] = input.split(/\s+/).map(Number);
      year += 2000;
    } else if (/^\d{1,2}\s+\d{1,2}$/.test(input)) {
      [month, day] = input.split(/\s+/).map(Number);
      year = currentYear;
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      [year, month, day] = input.split("-").map(Number);
    } else if (/^\d{4}\/\d{2}\/\d{2}$/.test(input)) {
      [year, month, day] = input.split("/").map(Number);
    } else if (/^\d{4}\.\d{2}\.\d{2}$/.test(input)) {
      [year, month, day] = input.split(".").map(Number);
    } else {
      const japaneseDate = await convertJapaneseEraToDate(input);
      if (!japaneseDate) return false;
      year = parseInt(japaneseDate.year);
      month = parseInt(japaneseDate.month);
      day = parseInt(japaneseDate.day);
    }

    if (!isValidDate(year, month, day)) return false;
    return `${year}-${pad(month)}-${pad(day)}`;
  }

  function getFieldData(data, fieldCode) {
    for (const key in data.table.fieldList) {
      if (data.table.fieldList[key].var === fieldCode) {
        return data.table.fieldList[key];
      }
    }
    for (const subKey in data.subTable) {
      for (const key in data.subTable[subKey].fieldList) {
        if (data.subTable[subKey].fieldList[key].var === fieldCode) {
          return data.subTable[subKey].fieldList[key];
        }
      }
    }
    return null;
  }

  async function getFormatDate(dateValue, format) {
    if (!dateValue) return "";
    if (format === "-----") return dateValue;

    const date = new Date(dateValue);
    const yearFull = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const yearShort = String(yearFull).slice(2);

    switch (format) {
      case "YYYY-MM-DD":
        return `${yearFull}-${month}-${day}`;
      case "YYYY/MM/DD":
        return `${yearFull}/${month}/${day}`;
      case "YYYY.MM.DD":
        return `${yearFull}.${month}.${day}`;
      case "YY/MM/DD":
        return `${yearShort}/${month}/${day}`;
      case "YY.MM.DD":
        return `${yearShort}.${month}.${day}`;
      case "eYY.MM.DD": {
        const jp = getJapaneseEra(date);
        return jp ? `${jp.eraSymbol}${jp.customYear}.${month}.${day}` : false;
      }
      case "e_YY_MM_DD": {
        const jp = getJapaneseEra(date);
        return jp ? `${jp.eraSymbol} ${jp.customYear} ${month} ${day}` : false;
      }
      default:
        return "";
    }
  }

  kintone.events.on(
    ["app.record.edit.show", "app.record.create.show"],
    async (event) => {
      let record = event.record;
      let errors = {};

      for (let item of CONFIG.formatSetting) {
        if (item.space === "-----") continue;
        kintone.app.record.setFieldShown(item.storeField.code, false);
        const spaceElement = kintone.app.record.getSpaceElement(item.space);
        if (!spaceElement) continue;

        let defaultDate = getAdjustedDate(item.initialValue);
        if (event.type === "app.record.edit.show") {
          defaultDate = record[item.storeField.code].value;
        }
        record[item.storeField.code].value = defaultDate;
        const defaultInputValue = await getFormatDate(defaultDate, item.format);

        const inputContainer = $("<div>").addClass(
          "control-gaia control-date-field-gaia"
        );
        const label = $("<div>")
          .addClass("control-label-gaia")
          .append(
            $("<label>")
              .addClass("control-label-text-gaia")
              .text(item.storeField.label)
          );
        const inputGroup = $("<div>").addClass("control-value-gaia");
        const inputError = $("<div>")
          .addClass("popup-alert")
          .append($("<span>").text("Invalid date format."))
          .hide();
        const input = $("<div>")
          .append(
            $("<input>")
              .attr("type", "text")
              .addClass("kintoneplugin-input-text date-input")
              .val(defaultInputValue || defaultDate)
              .on("change", async (e) => {
                const changeFormat = await parseDate(e.target.value.trim());
                if (changeFormat === false) {
                  $(inputError).show();
                  errors[item.storeField.code] = "Invalid date value";
                } else {
                  delete errors[item.storeField.code];
                  $(inputError).hide();
                  e.target.value = await getFormatDate(
                    changeFormat,
                    item.format
                  );
                  await setRecord(item.storeField.code, changeFormat);
                }
              })
          );

        inputGroup.append(input, inputError);
        inputContainer.append(label, inputGroup);
        $(spaceElement).append(inputContainer);
      }

      async function setRecord(fieldCode, value) {
        let rec = kintone.app.record.get();
        rec.record[fieldCode].value = value;
        kintone.app.record.set(rec);
      }

      kintone.events.on(
        ["app.record.edit.submit", "app.record.create.submit"],
        async (event) => {
          if (Object.keys(errors).length > 0)
            event.error = "Invalid value detected";
          return event;
        }
      );

      return event;
    }
  );

  kintone.events.on("app.record.detail.show", async (event) => {
    const schemaPage = cybozu.data.page.SCHEMA_DATA;
    let record = event.record;
    let errorMessage;

    for (const item of CONFIG.formatSetting) {
      let field = getFieldData(schemaPage, item.storeField.code);
      if (item.space !== "-----") {
        let spaceElement = kintone.app.record.getSpaceElement(item.space);
        $(spaceElement)?.parent().remove();
      }

      const dateValue = record[item.storeField.code].value;
      if (item.format === "-----") continue;
      const formatDate = await getFormatDate(dateValue, item.format);
      if (formatDate === false) {
        errorMessage = "Please apply the Constant Management Plugin";
      } else {
        $(`.value-${field.id}`).find("span").text(formatDate);
      }
    }

    if (errorMessage) {
      Swal10.fire({
        position: "center",
        icon: "error",
        text: errorMessage,
        confirmButtonColor: "#3498db",
        showCancelButton: false,
        confirmButtonText: "OK",
        customClass: { confirmButton: "custom-confirm-button" },
      });
    }
    return event;
  });

  kintone.events.on("app.record.index.show", async (event) => {
    const schemaPage = cybozu.data.page.SCHEMA_DATA;
    let errorMessage;

    for (const item of CONFIG.formatSetting) {
      let data = getFieldData(schemaPage, item.storeField.code);
      let fields = $(`.value-${data.id}`);

      for (const field of fields) {
        const dateValue = $(field).find("span").text();
        if (item.format === "-----") continue;
        const formatDate = await getFormatDate(dateValue, item.format);
        if (formatDate === false) {
          errorMessage = "Please apply the Constant Management Plugin";
        } else {
          $(field).find("span").text(formatDate);
        }
      }
    }

    if (errorMessage) {
      return Swal10.fire({
        position: "center",
        icon: "error",
        text: errorMessage,
        confirmButtonColor: "#3498db",
        showCancelButton: false,
        confirmButtonText: "OK",
        customClass: { confirmButton: "custom-confirm-button" },
      });
    }
    return event;
  });
})(jQuery, Sweetalert2_10.noConflict(true), kintone.$PLUGIN_ID);