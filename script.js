/// script.js
// Interactive visualization with multiple datasets, each taken from the provided files.

console.log("script.js – interactive-vis-a3 (correct dataset switching)");

// Layout
const margin = { top: 30, right: 20, bottom: 40, left: 60 };
const width = 800;
const height = 360;
const plotWidth = width - margin.left - margin.right;
const plotHeight = height - margin.top - margin.bottom;
const GLOBAL_MIN_YEAR = 1900; // global minimum year for x-axis

// LINE CHART SVG
const svgLine = d3
  .select("#line-chart")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

const gLine = svgLine
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const xScaleLine = d3.scaleLinear().range([0, plotWidth]);
const yScaleLine = d3.scaleLinear().range([plotHeight, 0]);

const xAxisLineG = gLine
  .append("g")
  .attr("class", "axis x-axis")
  .attr("transform", `translate(0,${plotHeight})`);

const yAxisLineG = gLine.append("g").attr("class", "axis y-axis");

// Gridlines
const yGridG = gLine.append("g").attr("class", "grid");

// Axis labels
gLine
  .append("text")
  .attr("class", "x-label")
  .attr("x", plotWidth / 2)
  .attr("y", plotHeight + 32)
  .attr("text-anchor", "middle")
  .text("Year");

const yAxisLabel = gLine
  .append("text")
  .attr("class", "y-label")
  .attr("x", -plotHeight / 2)
  .attr("y", -45)
  .attr("transform", "rotate(-90)")
  .attr("text-anchor", "middle")
  .text("Value");

// BAR CHART SVG
const svgBar = d3
  .select("#bar-chart")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

const gBar = svgBar
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const xScaleBar = d3.scaleBand().padding(0.2);
const yScaleBar = d3.scaleLinear().range([plotHeight, 0]);

const xAxisBarG = gBar
  .append("g")
  .attr("class", "axis x-axis")
  .attr("transform", `translate(0,${plotHeight})`);

const yAxisBarG = gBar.append("g").attr("class", "axis y-axis");

// Summary panel
const summaryPanel = d3.select("#summary-panel");

// Color scale
const color = d3.scaleOrdinal(d3.schemeTableau10);

// Brush on line chart
const brush = d3
  .brushX()
  .extent([
    [0, 0],
    [plotWidth, plotHeight],
  ])
  .on("brush end", brushed);

gLine.append("g").attr("class", "brush").call(brush);

// UI selections
const datasetSelect = d3.select("#dataset-select");
const countrySelect = d3.select("#country-select");
const yearMinInput = d3.select("#year-min");
const yearMaxInput = d3.select("#year-max");
const yearMinLabel = d3.select("#year-min-label");
const yearMaxLabel = d3.select("#year-max-label");

// Global containers/state
let datasets = {}; // key -> { key, label, records[], metricLabels, isRate }
let yearExtentByDataset = {}; // key -> [minYear, maxYear]
let countries = [];
let globalMaxYear = GLOBAL_MIN_YEAR;

let currentDatasetKey = "birthRates";
let yearExtent = [1900, 2000]; // x-axis domain, will be overwritten after data load
let currentYearMin;
let currentYearMax;
let currentMetric = "total"; // "total", "female", "male"

// ----------------- Parsing helpers -----------------

// Births: already per-year: country, year, female, male, total
function parseBirthsByYear(text) {
  const lines = text.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) =>
    line.trim().startsWith("PopName")
  );
  if (headerIndex === -1) return [];

  const dataLines = lines.slice(headerIndex + 1);
  const out = [];

  dataLines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const tokens = trimmed.split(/\s+/);
    if (tokens.length < 5) return;

    const country = tokens[0];
    const year = +tokens[1];
    const female = +tokens[2];
    const male = +tokens[3];
    const total = +tokens[4];

    if (Number.isNaN(year) || Number.isNaN(total)) return;

    out.push({ country, year, female, male, total });
  });

  return out;
}

// Deaths / Population: age-structured counts
function parseAgeStructuredCounts(text) {
  const lines = text.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) =>
    line.trim().startsWith("PopName")
  );
  if (headerIndex === -1) return [];

  const dataLines = lines.slice(headerIndex + 1);
  const out = [];

  dataLines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const tokens = trimmed.split(/\s+/);
    if (tokens.length < 6) return;

    const country = tokens[0];
    const year = +tokens[1];
    const female = +tokens[3];
    const male = +tokens[4];
    const total = +tokens[5];

    if (Number.isNaN(year) || Number.isNaN(female) || Number.isNaN(male)) {
      return;
    }

    out.push({
      country,
      year,
      female,
      male,
      total,
    });
  });

  return out;
}

// Death_Rates.txt: age-structured death rates (Female, Male, Total columns)
function parseDeathRatesAge(text) {
  const lines = text.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) =>
    line.trim().startsWith("PopName")
  );
  if (headerIndex === -1) return [];

  const dataLines = lines.slice(headerIndex + 1);
  const out = [];

  dataLines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const tokens = trimmed.split(/\s+/);
    if (tokens.length < 6) return;

    const country = tokens[0];
    const year = +tokens[1];
    const female = +tokens[3];
    const male = +tokens[4];
    const total = +tokens[5];

    if (Number.isNaN(year) || Number.isNaN(female) || Number.isNaN(male)) {
      return;
    }

    out.push({
      country,
      year,
      female,
      male,
      total,
    });
  });

  return out;
}

// Life tables (Female_Rate, Male_Rate, Gender_Rates): use mx & Lx to get weighted average
function parseLifeTable(text) {
  const lines = text.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) =>
    line.trim().startsWith("PopName")
  );
  if (headerIndex === -1) return [];

  const dataLines = lines.slice(headerIndex + 1);
  const out = [];

  dataLines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const tokens = trimmed.split(/\s+/);
    if (tokens.length < 11) return;

    const country = tokens[0];
    const year = +tokens[1];
    const mx = parseFloat(tokens[3]);
    const Lx = parseFloat(tokens[8]);

    if (Number.isNaN(year) || Number.isNaN(mx) || Number.isNaN(Lx)) return;

    out.push({ country, year, mx, Lx });
  });

  return out;
}

// Aggregate age-structured counts to per-year counts
function aggregateCountsByYear(records) {
  const roll = d3.rollup(
    records,
    (v) => ({
      female: d3.sum(v, (d) => d.female),
      male: d3.sum(v, (d) => d.male),
      total: d3.sum(v, (d) => d.total),
    }),
    (d) => d.country,
    (d) => d.year
  );

  const out = [];
  for (const [country, yearMap] of roll) {
    for (const [year, agg] of yearMap) {
      out.push({
        country,
        year: +year,
        female: agg.female,
        male: agg.male,
        total: agg.total,
      });
    }
  }
  out.sort(
    (a, b) => d3.ascending(a.country, b.country) || d3.ascending(a.year, b.year)
  );
  return out;
}

// Aggregate age-structured rates (Death_Rates.txt) to per-year averages (simple mean across ages)
function aggregateRatesByYear(records) {
  const roll = d3.rollup(
    records,
    (v) => ({
      female: d3.mean(v, (d) => d.female),
      male: d3.mean(v, (d) => d.male),
      total: d3.mean(v, (d) => d.total),
    }),
    (d) => d.country,
    (d) => d.year
  );

  const out = [];
  for (const [country, yearMap] of roll) {
    for (const [year, agg] of yearMap) {
      if (
        [agg.female, agg.male, agg.total].every((x) => Number.isNaN(x))
      ) {
        continue;
      }
      out.push({
        country,
        year: +year,
        female: agg.female,
        male: agg.male,
        total: agg.total,
      });
    }
  }
  out.sort(
    (a, b) => d3.ascending(a.country, b.country) || d3.ascending(a.year, b.year)
  );
  return out;
}

// Aggregate life-table mx values weighted by Lx
function aggregateLifeTableMx(records) {
  const roll = d3.rollup(
    records,
    (v) => {
      const sumLx = d3.sum(v, (d) => d.Lx);
      const sumMxLx = d3.sum(v, (d) => d.mx * d.Lx);
      const rate = sumLx > 0 ? sumMxLx / sumLx : NaN;
      return { rate };
    },
    (d) => d.country,
    (d) => d.year
  );

  const out = [];
  for (const [country, yearMap] of roll) {
    for (const [year, val] of yearMap) {
      if (Number.isNaN(val.rate)) continue;
      out.push({
        country,
        year: +year,
        rate: val.rate,
      });
    }
  }
  out.sort(
    (a, b) => d3.ascending(a.country, b.country) || d3.ascending(a.year, b.year)
  );
  return out;
}

// Compute per-1000 rates from numerator and denominator counts
function computePerThousandRates(numerData, denomData) {
  const popMap = new Map();
  denomData.forEach((d) => {
    popMap.set(`${d.country}|${d.year}`, d);
  });

  const safeRate = (num, den) =>
    !den || Number.isNaN(num) || Number.isNaN(den) ? NaN : (num / den) * 1000;

  const out = [];
  numerData.forEach((d) => {
    const key = `${d.country}|${d.year}`;
    const pop = popMap.get(key);
    if (!pop) return;

    const female = safeRate(d.female, pop.female);
    const male = safeRate(d.male, pop.male);
    const total = safeRate(d.total, pop.total);

    if ([female, male, total].every((v) => Number.isNaN(v))) return;

    out.push({
      country: d.country,
      year: d.year,
      female,
      male,
      total,
    });
  });

  out.sort(
    (a, b) => d3.ascending(a.country, b.country) || d3.ascending(a.year, b.year)
  );
  return out;
}

// ----------------- Data loading -----------------

Promise.all([
  d3.text("data/Births.txt"),
  d3.text("data/Deaths.txt"),
  d3.text("data/Population.txt"),
  d3.text("data/Death_Rates.txt"),
  d3.text("data/Female_Rate.txt"),
  d3.text("data/Male_Rate.txt"),
  d3.text("data/Gender_Rates.txt"),
])
  .then(
    ([
      birthsText,
      deathsText,
      populationText,
      deathRatesText,
      femaleLifeText,
      maleLifeText,
      genderLifeText,
    ]) => {
      // Base datasets
      const birthsByYear = parseBirthsByYear(birthsText);
      const deathsByAge = parseAgeStructuredCounts(deathsText);
      const popByAge = parseAgeStructuredCounts(populationText);
      const deathRatesByAge = parseDeathRatesAge(deathRatesText);

      const deathsByYear = aggregateCountsByYear(deathsByAge);
      const popByYear = aggregateCountsByYear(popByAge);
      const deathRatesByYear = aggregateRatesByYear(deathRatesByAge);

      const birthRates = computePerThousandRates(birthsByYear, popByYear);

      // Life-table based datasets
      const femaleLt = parseLifeTable(femaleLifeText);
      const maleLt = parseLifeTable(maleLifeText);
      const genderLt = parseLifeTable(genderLifeText);

      const femaleRateAgg = aggregateLifeTableMx(femaleLt);
      const maleRateAgg = aggregateLifeTableMx(maleLt);
      const genderRateAgg = aggregateLifeTableMx(genderLt);

      datasets = {
        births: {
          key: "births",
          label: "Births (counts)",
          records: birthsByYear,
          metricLabels: {
            total: "total births",
            female: "female births",
            male: "male births",
          },
          isRate: false,
        },
        deaths: {
          key: "deaths",
          label: "Deaths (counts)",
          records: deathsByYear,
          metricLabels: {
            total: "total deaths",
            female: "female deaths",
            male: "male deaths",
          },
          isRate: false,
        },
        birthRates: {
          key: "birthRates",
          label: "Birth rates (per 1,000 population)",
          records: birthRates,
          metricLabels: {
            total: "births per 1,000 population",
            female: "female births per 1,000 population",
            male: "male births per 1,000 population",
          },
          isRate: true,
        },
        deathRates: {
          key: "deathRates",
          label: "Death rates (averaged across ages)",
          records: deathRatesByYear,
          metricLabels: {
            total: "average death rate across ages",
            female: "average female death rate across ages",
            male: "average male death rate across ages",
          },
          isRate: true,
        },
        femaleRates: {
          key: "femaleRates",
          label: "Female_Rates (life table mx, weighted by Lx)",
          records: femaleRateAgg.map((d) => ({
            country: d.country,
            year: d.year,
            female: d.rate,
            male: NaN,
            total: d.rate,
          })),
          metricLabels: {
            total: "female mortality rate (mx, weighted)",
            female: "female mortality rate (mx, weighted)",
            male: "N/A",
          },
          isRate: true,
        },
        maleRates: {
          key: "maleRates",
          label: "Male_Rates (life table mx, weighted by Lx)",
          records: maleRateAgg.map((d) => ({
            country: d.country,
            year: d.year,
            female: NaN,
            male: d.rate,
            total: d.rate,
          })),
          metricLabels: {
            total: "male mortality rate (mx, weighted)",
            female: "N/A",
            male: "male mortality rate (mx, weighted)",
          },
          isRate: true,
        },
        genderRates: {
          key: "genderRates",
          label: "Gender_Rates (Both, life table mx, weighted by Lx)",
          records: genderRateAgg.map((d) => ({
            country: d.country,
            year: d.year,
            female: d.rate,
            male: d.rate,
            total: d.rate,
          })),
          metricLabels: {
            total: "combined-gender mortality rate (mx, weighted)",
            female: "combined-gender mortality rate (mx, weighted)",
            male: "combined-gender mortality rate (mx, weighted)",
          },
          isRate: true,
        },
        population: {
          key: "population",
          label: "Population size (female / male / total)",
          records: popByYear,
          metricLabels: {
            total: "total population",
            female: "female population",
            male: "male population",
          },
          isRate: false,
        },
      };

      // Countries: union across all datasets
      const countrySet = new Set();
      Object.values(datasets).forEach((ds) => {
        ds.records.forEach((d) => countrySet.add(d.country));
      });
      countries = Array.from(countrySet).sort();

      // Year extent per dataset
      Object.entries(datasets).forEach(([key, ds]) => {
        yearExtentByDataset[key] = d3.extent(ds.records, (d) => d.year);
      });

      // Global maximum year across all datasets
      globalMaxYear = d3.max(
        Object.values(yearExtentByDataset),
        (ext) => ext[1]
      );

      // Initial dataset: birthRates (View 1)
      currentDatasetKey = "birthRates";
      const dsExtent = yearExtentByDataset[currentDatasetKey]; // true data extent

      // Global x-axis domain: 1900 to globalMaxYear
      yearExtent = [GLOBAL_MIN_YEAR, globalMaxYear];
      xScaleLine.domain(yearExtent);

      // UI / filter range: 1900 to this dataset's max year
      currentYearMin = GLOBAL_MIN_YEAR;
      currentYearMax = dsExtent[1];

      // Initialize UI
      initCountrySelect();
      initYearInputs();
      initMetricRadio();
      initDatasetSelect();

      // Make the dropdown show View 1 (birthRates)
      datasetSelect.property("value", currentDatasetKey);

      // Default country selection
      const defaultCountries = ["USA", "GBR", "AUS", "CAN"].filter((c) =>
        countries.includes(c)
      );

      const initialCountries =
        defaultCountries.length > 0 ? defaultCountries : countries.slice(0, 4);

      countrySelect
        .selectAll("option")
        .property("selected", (d) => initialCountries.includes(d));

      // Year inputs + labels (min entry always 1900, max is dataset-specific)
      yearMinInput
        .attr("min", GLOBAL_MIN_YEAR)
        .attr("max", dsExtent[1])
        .attr("value", currentYearMin);
      yearMaxInput
        .attr("min", GLOBAL_MIN_YEAR)
        .attr("max", dsExtent[1])
        .attr("value", currentYearMax);

      yearMinLabel.text(currentYearMin);
      yearMaxLabel.text(currentYearMax);

      updateAll(true, true);
    }
  )
  .catch((err) => {
    console.error("Error loading data:", err);
  });

// ----------------- UI initialization -----------------

function initCountrySelect() {
  countrySelect
    .selectAll("option")
    .data(countries)
    .join("option")
    .attr("value", (d) => d)
    .text((d) => d);

  countrySelect.on("change", () => {
    updateAll();
  });
}

function initYearInputs() {
  function applyYearChange() {
    const dsExtent = yearExtentByDataset[currentDatasetKey] || yearExtent;
    const minBound = GLOBAL_MIN_YEAR;
    const maxBound = dsExtent[1];

    let minVal = +yearMinInput.node().value;
    let maxVal = +yearMaxInput.node().value;

    if (Number.isNaN(minVal)) minVal = minBound;
    if (Number.isNaN(maxVal)) maxVal = maxBound;

    if (minVal > maxVal) {
      [minVal, maxVal] = [maxVal, minVal];
    }

    minVal = Math.max(minBound, Math.min(minVal, maxBound));
    maxVal = Math.max(minBound, Math.min(maxVal, maxBound));

    yearMinInput.node().value = minVal;
    yearMaxInput.node().value = maxVal;

    currentYearMin = minVal;
    currentYearMax = maxVal;
    yearMinLabel.text(minVal);
    yearMaxLabel.text(maxVal);

    updateAll(false, true); // don't reset brush; move brush to match
  }

  yearMinInput
    .on("change", applyYearChange)
    .on("keydown", (event) => {
      if (event.key === "Enter") applyYearChange();
    });

  yearMaxInput
    .on("change", applyYearChange)
    .on("keydown", (event) => {
      if (event.key === "Enter") applyYearChange();
    });
}

function initMetricRadio() {
  d3.selectAll("input[name='metric']").on("change", (event) => {
    currentMetric = event.target.value;
    updateAll();
  });
}

function initDatasetSelect() {
  datasetSelect.on("change", () => {
    currentDatasetKey = datasetSelect.node().value;
    const dsExtent = yearExtentByDataset[currentDatasetKey];
    if (!dsExtent) return;

    // Global x-axis domain (same for all datasets)
    yearExtent = [GLOBAL_MIN_YEAR, globalMaxYear];
    xScaleLine.domain(yearExtent);

    // Year filter range specific to this dataset
    currentYearMin = GLOBAL_MIN_YEAR;
    currentYearMax = dsExtent[1];

    yearMinInput
      .attr("min", GLOBAL_MIN_YEAR)
      .attr("max", dsExtent[1])
      .attr("value", currentYearMin);
    yearMaxInput
      .attr("min", GLOBAL_MIN_YEAR)
      .attr("max", dsExtent[1])
      .attr("value", currentYearMax);
    yearMinLabel.text(currentYearMin);
    yearMaxLabel.text(currentYearMax);

    updateAll(true, true);
  });
}

// ----------------- Shared helpers -----------------

function getSelectedCountries() {
  const options = Array.from(countrySelect.node().selectedOptions);
  if (options.length === 0) {
    return countries;
  }
  return options.map((o) => o.value);
}

function getYearRange() {
  return [currentYearMin, currentYearMax];
}

// Brush handler
function brushed(event) {
  if (!event.selection) return;
  const [x0, x1] = event.selection;
  const year0 = Math.round(xScaleLine.invert(x0));
  const year1 = Math.round(xScaleLine.invert(x1));

  const dsExtent = yearExtentByDataset[currentDatasetKey] || yearExtent;
  const minBound = GLOBAL_MIN_YEAR;
  const maxBound = dsExtent[1];

  currentYearMin = Math.max(minBound, Math.min(year0, year1));
  currentYearMax = Math.min(maxBound, Math.max(year0, year1));

  yearMinInput.node().value = currentYearMin;
  yearMaxInput.node().value = currentYearMax;
  yearMinLabel.text(currentYearMin);
  yearMaxLabel.text(currentYearMax);

  updateAll(false, false);
}

// ----------------- Main update pipeline -----------------

function updateAll(resetBrush = true, updateBrushFromInputs = false) {
  const ds = datasets[currentDatasetKey];
  if (!ds || !ds.records) return;

  const selectedCountries = getSelectedCountries();
  const [yearMin, yearMax] = getYearRange();

  const filtered = ds.records.filter(
    (d) => d.year >= yearMin && d.year <= yearMax
  );

  // Update y-axis label to reflect current dataset + metric
  const metricLabel =
    (ds.metricLabels && ds.metricLabels[currentMetric]) || currentMetric;
  yAxisLabel.text(metricLabel);

  updateLineChart(filtered, selectedCountries);
  updateBarChart(filtered, selectedCountries);
  updateSummary(filtered, selectedCountries, yearMin, yearMax);

  if (resetBrush) {
    gLine.select(".brush").call(brush.move, null);
  }

  if (updateBrushFromInputs) {
    const x0 = xScaleLine(yearMin);
    const x1 = xScaleLine(yearMax);
    gLine.select(".brush").call(brush.move, [x0, x1]);
  }
}

// ----------------- Line chart -----------------

function updateLineChart(data, selectedCountries) {
  const metric = currentMetric;

  // Global x-axis domain: always from 1900 to the maximum year seen in any dataset
  const dsExtent = yearExtentByDataset[currentDatasetKey];
  const maxYearFromData =
    (dsExtent && dsExtent[1]) || d3.max(data, (d) => d.year) || GLOBAL_MIN_YEAR;

  const domainMax = globalMaxYear || maxYearFromData;
  yearExtent = [GLOBAL_MIN_YEAR, domainMax];
  xScaleLine.domain(yearExtent);

  const maxVal = d3.max(data, (d) => d[metric]) || 1;
  yScaleLine.domain([0, maxVal * 1.05]);

  const series = selectedCountries.map((country) => ({
    country,
    values: data
      .filter((d) => d.country === country)
      .sort((a, b) => a.year - b.year),
  }));

  color.domain(selectedCountries);

  const lineGen = d3
    .line()
    .defined((d) => !Number.isNaN(d[metric]))
    .x((d) => xScaleLine(d.year))
    .y((d) => yScaleLine(d[metric]));

  const span = domainMax - GLOBAL_MIN_YEAR;
  let step = 10;
  if (span <= 50) step = 5;
  else if (span >= 160) step = 20;

  const tickValues = d3.range(GLOBAL_MIN_YEAR, domainMax + 1, step);

  const xAxis = d3
    .axisBottom(xScaleLine)
    .tickValues(tickValues)
    .tickFormat(d3.format("d"));
  const yAxis = d3.axisLeft(yScaleLine).ticks(6);

  xAxisLineG.call(xAxis);
  yAxisLineG.call(yAxis);

  const yGrid = d3
    .axisLeft(yScaleLine)
    .ticks(6)
    .tickSize(-plotWidth)
    .tickFormat("");
  yGridG.call(yGrid);

  const linePaths = gLine
    .selectAll(".line-path")
    .data(series, (d) => d.country);

  linePaths
    .join(
      (enter) =>
        enter
          .append("path")
          .attr("class", "line-path")
          .attr("stroke", (d) => color(d.country))
          .attr("d", (d) => lineGen(d.values)),
      (update) =>
        update
          .attr("stroke", (d) => color(d.country))
          .attr("d", (d) => lineGen(d.values)),
      (exit) => exit.remove()
    )
    .classed("active", true);

  const labels = gLine
    .selectAll(".country-label")
    .data(series.filter((s) => s.values.length > 0), (d) => d.country);

  labels
    .join(
      (enter) =>
        enter
          .append("text")
          .attr("class", "country-label")
          .attr("x", plotWidth + 4)
          .attr("y", (d) => {
            const last = d.values[d.values.length - 1];
            return yScaleLine(last[metric]);
          })
          .attr("alignment-baseline", "middle")
          .text((d) => d.country),
      (update) =>
        update.attr("y", (d) => {
          const last = d.values[d.values.length - 1];
          return yScaleLine(last[metric]);
        }),
      (exit) => exit.remove()
    )
    .attr("fill", (d) => color(d.country));
}

// ----------------- Bar chart -----------------

function updateBarChart(data, selectedCountries) {
  const metric = currentMetric;

  const aggregated = selectedCountries.map((country) => {
    const subset = data.filter(
      (d) => d.country === country && !Number.isNaN(d[metric])
    );
    const mean = subset.length ? d3.mean(subset, (d) => d[metric]) : 0;
    return { country, value: mean };
  });

  const maxVal = d3.max(aggregated, (d) => d.value) || 1;
  xScaleBar.domain(aggregated.map((d) => d.country)).range([0, plotWidth]);
  yScaleBar.domain([0, maxVal * 1.1]);

  const xAxis = d3.axisBottom(xScaleBar);
  const yAxis = d3.axisLeft(yScaleBar).ticks(6);

  xAxisBarG.call(xAxis);
  yAxisBarG.call(yAxis);

  const bars = gBar.selectAll(".bar").data(aggregated, (d) => d.country);

  bars
    .join(
      (enter) =>
        enter
          .append("rect")
          .attr("class", "bar")
          .attr("x", (d) => xScaleBar(d.country))
          .attr("width", xScaleBar.bandwidth())
          .attr("y", (d) => yScaleBar(d.value))
          .attr("height", (d) => plotHeight - yScaleBar(d.value))
          .attr("fill", (d) => color(d.country)),
      (update) =>
        update
          .attr("x", (d) => xScaleBar(d.country))
          .attr("width", xScaleBar.bandwidth())
          .attr("y", (d) => yScaleBar(d.value))
          .attr("height", (d) => plotHeight - yScaleBar(d.value))
          .attr("fill", (d) => color(d.country)),
      (exit) => exit.remove()
    );
}

// ----------------- Summary panel -----------------

function updateSummary(data, selectedCountries, yearMin, yearMax) {
  const dsMeta = datasets[currentDatasetKey];
  if (!dsMeta) return;

  if (selectedCountries.length === 0 || data.length === 0) {
    summaryPanel.html(
      "<p>Select one or more countries and a valid year range to view summary statistics.</p>"
    );
    return;
  }

  const metric = currentMetric;
  const metricLabel =
    (dsMeta.metricLabels && dsMeta.metricLabels[metric]) || metric;
  const fmt = dsMeta.isRate ? d3.format(".4f") : d3.format(".0f");

  const perCountry = selectedCountries.map((country) => {
    const subset = data.filter(
      (d) => d.country === country && !Number.isNaN(d[metric])
    );
    if (subset.length === 0) {
      return {
        country,
        count: 0,
        mean: NaN,
        min: NaN,
        max: NaN,
      };
    }
    return {
      country,
      count: subset.length,
      mean: d3.mean(subset, (d) => d[metric]),
      min: d3.min(subset, (d) => d[metric]),
      max: d3.max(subset, (d) => d[metric]),
    };
  });

  const overall = {
    count: d3.sum(perCountry, (d) => d.count),
    mean: d3.mean(
      perCountry.filter((d) => d.count > 0 && Number.isFinite(d.mean)),
      (d) => d.mean
    ),
  };

  const countryItems = perCountry
    .map((d) => {
      const meanStr = Number.isFinite(d.mean) ? fmt(d.mean) : "N/A";
      const minStr = Number.isFinite(d.min) ? fmt(d.min) : "N/A";
      const maxStr = Number.isFinite(d.max) ? fmt(d.max) : "N/A";
      return `<li><strong>${d.country}</strong> – years: ${
        d.count
      }, avg ${metricLabel}: ${meanStr}, min: ${minStr}, max: ${maxStr}</li>`;
    })
    .join("");

  const overallMeanStr = Number.isFinite(overall.mean)
    ? fmt(overall.mean)
    : "N/A";

  summaryPanel.html(`
    <h3>Summary for ${metricLabel} (${yearMin}–${yearMax})</h3>
    <p>Dataset: ${dsMeta.label}</p>
    <p>Selected countries: ${selectedCountries.join(", ")}</p>
    <p>Total country-year observations: ${overall.count}</p>
    <p>Mean ${metricLabel} across selected countries: ${overallMeanStr}</p>
    <ul>
      ${countryItems}
    </ul>
  `);
}
