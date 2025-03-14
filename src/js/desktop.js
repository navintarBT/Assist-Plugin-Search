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
    if (window.BoK) {
      if (!window.BoK.Constant.JpCalenderBase) {
        Swal10.fire({
          position: "center",
          icon: "error",
          text: "Apply the Constant Control plugin.”",
          confirmButtonColor: "#3498db",
          showCancelButton: false,
          confirmButtonText: "OK",
          customClass: {
            confirmButton: "custom-confirm-button",
          },
        });
        return false;
      }
    } else {
      Swal10.fire({
        position: "center",
        icon: "error",
        text: "Apply the Constant Control plugin.”",
        confirmButtonColor: "#3498db",
        showCancelButton: false,
        confirmButtonText: "OK",
        customClass: {
          confirmButton: "custom-confirm-button",
        },
      });
      return false;
    }
    const JP_CALENDAR = window.BoK.Constant.JpCalenderBase.sort(
      (a, b) => new Date(a[0]) - new Date(b[0])
    );
    let eraSymbol, customYear, month, day;
    // Normalize the input: remove extra spaces and split into parts
    // Check for "eYY.MM.DD" format
    if (/^[A-Za-z]\d{2}\.\d{2}\.\d{2}$/.test(eraInput)) {
      const match = /^([A-Za-z])(\d{2})\.(\d{2})\.(\d{2})$/.exec(eraInput);
      [, eraSymbol, customYear, month, day] = match;
    } else if (/^[A-Za-z]\d{2}\d{2}\d{2}$/.test(eraInput)) {
      // Handle compact format: eYYMMDD
      const match = /^([A-Za-z])(\d{2})(\d{2})(\d{2})$/.exec(eraInput);
      [, eraSymbol, customYear, month, day] = match;
    } else if (/^[A-Za-z] \d{1,2} \d{1,2} \d{1,2}$/.test(eraInput)) {
      // Handle spaced format: e YY MM DD or e Y MM D
      const parts = eraInput.split(" ");
      [eraSymbol, customYear, month, day] = parts;
    } else {
      return false; // Explicitly return false for invalid formats
    }
    customYear = parseInt(customYear, 10); // Parse as integer
    month = parseInt(month, 10); // Parse as integer
    day = parseInt(day, 10); // Parse as integer

    // Validate parsed parts
    if (isNaN(customYear) || isNaN(month) || isNaN(day)) {
      return false;
    }
    // Find the corresponding era start date
    const eraData = JP_CALENDAR.find(
      (entry) => entry[2].toUpperCase() === eraSymbol.toUpperCase()
    );
    if (!eraData) {
      return false;
    }

    const eraStartDate = new Date(eraData[0]); // Get the era's start date

    // Determine the Gregorian year
    let year = eraStartDate.getFullYear() + customYear - 1;

    // Validate the month and day
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return false;
    }
    return {
      year: String(year),
      month: String(month),
      day: String(day),
    };
  }

  async function parseDate(input) {
    if (!input) return getAdjustedDate(0);
    try {
      const currentYear = new Date().getFullYear();
      let year, month, day;

      // Helper function to pad single-digit numbers with leading zeros
      const pad = (num) => String(num).padStart(2, "0");
      const isValidDate = (y, m, d) => {
        const date = new Date(y, m - 1, d); // Months are 0-indexed in JS
        return (
          date.getFullYear() === y &&
          date.getMonth() + 1 === m &&
          date.getDate() === d
        );
      };

      // Handle different formats
      if (/^\d{8}$/.test(input)) {
        // YYYYMMDD
        year = parseInt(input.slice(0, 4), 10);
        month = parseInt(input.slice(4, 6), 10);
        day = parseInt(input.slice(6, 8), 10);
      } else if (/^\d{6}$/.test(input)) {
        // YYMMDD
        year = parseInt(input.slice(0, 2), 10) + 2000; // Assuming 21st century
        month = parseInt(input.slice(2, 4), 10);
        day = parseInt(input.slice(4, 6), 10);
      } else if (/^\d{4}$/.test(input)) {
        // MMDD
        year = currentYear;
        month = parseInt(input.slice(0, 2), 10);
        day = parseInt(input.slice(2, 4), 10);
      } else if (/^\d{1,2}\/\d{1,2}$/.test(input)) {
        // MM/DD or MM/D
        const [m, d] = input.split("/");
        year = currentYear;
        month = parseInt(m, 10);
        day = parseInt(d, 10);
      } else if (/^\d{4} \d{1,2} \d{1,2}$/.test(input)) {
        // YYYY M D
        const [y, m, d] = input.split(" ");
        year = parseInt(y, 10);
        month = parseInt(m, 10);
        day = parseInt(d, 10);
      } else if (/^\d{2} \d{1,2} \d{1,2}$/.test(input)) {
        // YY M D
        const [y, m, d] = input.split(" ");
        year = parseInt(y, 10) + 2000; // Assuming 21st century
        month = parseInt(m, 10);
        day = parseInt(d, 10);
      } else if (/^\d{1,2} \d{1,2}$/.test(input)) {
        // M D
        const [m, d] = input.split(" ");
        year = currentYear;
        month = parseInt(m, 10);
        day = parseInt(d, 10);
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
        // YYYY-MM-DD
        const [y, m, d] = input.split("-");
        year = parseInt(y, 10);
        month = parseInt(m, 10);
        day = parseInt(d, 10);
      } else if (/^\d{4}\/\d{2}\/\d{2}$/.test(input)) {
        // YYYY/MM/DD
        const [y, m, d] = input.split("/");
        year = parseInt(y, 10);
        month = parseInt(m, 10);
        day = parseInt(d, 10);
      } else if (/^\d{4}\.\d{2}\.\d{2}$/.test(input)) {
        // YYYY.MM.DD
        const [y, m, d] = input.split(".");
        year = parseInt(y, 10);
        month = parseInt(m, 10);
        day = parseInt(d, 10);
      } else {
        //eYYMMDD
        //e YY MM DD
        //e Y MM D
        let revert = await convertJapaneseEraToDate(input);
        if (!revert) return false;
        year = parseInt(revert.year, 10);
        month = parseInt(revert.month, 10);
        day = parseInt(revert.day, 10);
      }
      // Validate the extracted date
      if (!isValidDate(year, month, day)) {
        return false; // Invalid date
      }

      return `${year}-${pad(month)}-${pad(day)}`;
    } catch (error) {
      return false;
    }
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
        const input = $("<div>").append(
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
                e.target.value = await getFormatDate(changeFormat, item.format);
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
    if (errorMessage)
      return Swal10.fire({
        position: "center",
        icon: "error",
        text: errorMessage,
        confirmButtonColor: "#3498db",
        showCancelButton: false,
        confirmButtonText: "OK",
        customClass: {
          confirmButton: "custom-confirm-button",
        },
      });

    //__________________________________________________________________
    const spaceEl = kintone.app.getHeaderMenuSpaceElement();
    if ($(spaceEl).find(".custom-space-el").length > 0) {
      return;
    }
    const elementsAll = $("<div></div>").addClass("custom-space-el");
    let btnSearch = $("<button></button>")
      .addClass("kintoneplugin-button-dialog-ok search")
      .text("Search");
    let btnCancel = $("<button></button>")
      .addClass("kintoneplugin-button-dialog-ok cancel")
      .text("Cancel");
    let getFieldResponse = await kintone.api(
      "/k/v1/preview/app/form/fields",
      "GET",
      {
        app: kintone.app.getId(),
      }
    );

    const urlObj = new URL(window.location.href);
    const bokTerm = urlObj.searchParams.get("bokTerms");
    let bokTermObj = JSON.parse(bokTerm);
    if (bokTermObj == null) {
      createInputBox(getFieldResponse, CONFIG.searchContent, "initial");
    } else {
      createInputBox(getFieldResponse, bokTermObj);
    }

    function createInputBox(getFieldResponse, createInputDate, status) {
      createInputDate.forEach((item) => {
        let elements = $("<div></div>").addClass("custom-input-date");
        let elementsLabelDate = $("<div></div>").addClass("label-and-date");
        let labelEl = $("<label></label>");
        let field = item.fieldSearch.code;
        if (getFieldResponse.properties[field]) {
          let currentInputType;
          let setClass = item.searchName.replace(/\s+/g, "_");
          const inputError = $("<div>")
            .addClass("input-error search")
            .append($("<span></span>").text("Incorrect value."))
            .hide();

          labelEl
            .text(item.searchName)
            .addClass(`label-${setClass}`)
            .on("click", function (event) {
              $(".popup").remove();
              const popup = document.createElement("div");
              popup.className = "popup";
              popup.innerHTML = `
            <button class="exact">Exact</button>
            <button class="range">Range</button>
          `;
              elements.append(popup);
              event.stopPropagation();

              document.addEventListener("click", function closePopup(e) {
                if (!popup.contains(e.target)) {
                  popup.remove();
                  document.removeEventListener("click", closePopup);
                }
              });

              // Exact
              popup
                .querySelector(".exact")
                .addEventListener("click", function (event) {
                  event.stopPropagation();
                  if (currentInputType !== "exact") {
                    elementsLabelDate.children(":not(label)").remove();
                    const dateInput = createDateInput(item.searchName);
                    $(dateInput)
                      .find("input")
                      .on("change", async function (e) {
                        let changeFormat = await parseDate(
                          e.target.value.trim()
                        );
                        if (changeFormat === false) {
                          inputError.show();
                        } else {
                          inputError.hide();
                        }
                      });
                    elementsLabelDate.append(dateInput, inputError);
                    currentInputType = "exact";
                  }
                  popup.remove();
                });

              // Range
              popup
                .querySelector(".range")
                .addEventListener("click", function (event) {
                  event.stopPropagation();
                  if (currentInputType !== "range") {
                    elementsLabelDate.children(":not(label)").remove();
                    const dateRange = createDateRangeInput(item.searchName);
                    dateRange.querySelectorAll("input").forEach((input) => {
                      input.addEventListener("change", async function (e) {
                        let changeFormat = await parseDate(
                          e.target.value.trim()
                        );
                        if (changeFormat === false) {
                          inputError.show();
                        } else {
                          inputError.hide();
                        }
                      });
                    });
                    elementsLabelDate.append(dateRange, inputError);
                    currentInputType = "range";
                  }
                  popup.remove();
                });
            });

          elementsLabelDate.append(labelEl);
          let dateInput;
          if (status === "initial") {
            let value = "";
            dateInput = $(createDateInput(item.searchName, value));
            currentInputType = "exact";
          } else {
            if (item.type == "exact") {
              dateInput = $(createDateInput(item.searchName, item.value));
              currentInputType = "exact";
            } else {
              dateInput = $(
                createDateRangeInput(
                  item.searchName,
                  item.startDate,
                  item.endDate
                )
              );
              currentInputType = "range";
            }
          }
          dateInput.find("input").on("change", async function (e) {
            let changeFormat = await parseDate(e.target.value.trim());
            if (changeFormat === false) {
              inputError.show();
            } else {
              inputError.hide();
            }
          });
          elementsLabelDate.append(dateInput, inputError);
          elements.append(elementsLabelDate);
        }
        elementsAll.append(elements);
      });
      elementsAll.append(btnSearch, btnCancel);
      $(spaceEl).append(elementsAll);
    }

    btnSearch.on("click", async function () {
      let searchInfoList = [];
      let query = "";
      let hasError =
        elementsAll.find(".input-error.search").filter(function () {
          return $(this).css("display") !== "none";
        }).length > 0;

      if (hasError) {
        Swal10.fire({
          icon: "error",
          title: "Invalid Input",
          text: "Please correct the highlighted errors before proceeding.",
          confirmButtonText: "OK",
        });
        return;
      }

      CONFIG.searchContent.forEach((item) => {
        let setClass = item.searchName.replace(/\s+/g, "_");
        let nextElement = elementsAll.find(`.label-${setClass}`).next();
        if (nextElement.length) {
          if (nextElement.hasClass("exact")) {
            let value = nextElement.find("input").val();
            searchInfoList.push({
              fieldSearch: {
                code: item.fieldSearch.code,
                label: item.fieldSearch.label,
              },
              searchName: item.searchName,
              value: value,
              type: "exact",
            });
            if (value) {
              query += `(${item.fieldSearch.code} = "${value}") and `;
            }
          } else if (nextElement.hasClass("date-range")) {
            let startDate = nextElement.find("input").first().val();
            let endDate = nextElement.find("input").last().val();
            searchInfoList.push({
              fieldSearch: {
                code: item.fieldSearch.code,
                label: item.fieldSearch.label,
              },
              searchName: item.searchName,
              startDate: startDate,
              endDate: endDate,
              type: "range",
            });
            if (startDate && endDate) {
              query += `((${item.fieldSearch.code} >= "${startDate}") and (${item.fieldSearch.code} <= "${endDate}")) and `;
            } else if (startDate) {
              query += `(${item.fieldSearch.code} >= "${startDate}") and `;
            } else if (endDate) {
              query += `(${item.fieldSearch.code} <= "${endDate}") and `;
            }
          }
        }
      });
      query = query.replace(/ and $/, "");
      await searchProcess(query, searchInfoList);
    });

    let searchProcess = async function (query, searchInfoList) {
      const bokTermsString = JSON.stringify(searchInfoList);
      let queryEscape = encodeURIComponent(query);
      const bokTerms = encodeURIComponent(bokTermsString);
      const newUrl = new URL(window.location.href);
      const baseUrl = `${newUrl.origin}${newUrl.pathname}`;
      const currentUrlBase = baseUrl;
      let url =
        currentUrlBase +
        `?view=${event.viewId}${queryEscape ? "&query=" + queryEscape : ""}&bokTerms=${bokTerms}`;
      window.location.href = url;
    };

    function createDateInput(searchName, value) {
      let dateInput = searchName.replace(/\s+/g, "_");
      const datePicker = $("<div></div>")
        .addClass("input-date-cybozu exact")
        .append(
          $("<input>")
            .attr("type", "text")
            .attr("id", `${dateInput}`)
            .val(value)
            .addClass("input-date-text-cybozu exact")
        );
      return datePicker;
    }

    function createDateRangeInput(searchName, startDate, endDate) {
      let dateRange = searchName.replace(/\s+/g, "_");
      const datePickerStart = $("<div></div>")
        .addClass("input-date-cybozu")
        .append(
          $("<input>")
            .attr("type", "text")
            .attr("id", `${dateRange}_start`)
            .addClass("input-date-text-cybozu range")
            .val(startDate)
        );
      const datePickerEnd = $("<div></div>")
        .addClass("input-date-cybozu")
        .append(
          $("<input>")
            .attr("type", "text")
            .attr("id", `${dateRange}_end`)
            .addClass("input-date-text-cybozu range")
            .val(endDate)
        );
      const separator = document.createElement("span");
      separator.textContent = " ~ ";
      const wrapper = document.createElement("div");
      wrapper.style.display = "flex";
      wrapper.classList.add("date-range");
      wrapper.appendChild(datePickerStart[0]);
      wrapper.appendChild(separator);
      wrapper.appendChild(datePickerEnd[0]);
      return wrapper;
    }
    return event;
  });
})(jQuery, Sweetalert2_10.noConflict(true), kintone.$PLUGIN_ID);
