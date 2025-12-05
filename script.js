// script.js

console.log("script.js – VERSION 7");

// layout
const margin = { top: 20, right: 20, bottom: 40, left: 60 };
const width = 700;
const height = 360;

const svg = d3
  .select("#line-chart")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

const plotWidth = width - margin.left - margin.right;
const plotHeight = height - margin.top - margin.bottom;

const g = svg
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// Scales
const xScale = d3.scaleLinear().range([0, plotWidth]);
const yScale = d3.scaleLinear().range([plotHeight, 0]);

// Years
const yearMinInput = d3.select("#year-min");
const yearMaxInput = d3.select("#year-max");

// Axes groups
const xAxisG = g
  .append("g")
  .attr("class", "axis axis-x")
  .attr("transform", `translate(0,${plotHeight})`);

const yAxisG = g.append("g").attr("class", "axis axis-y");

// Gridlines
const yGridG = g.append("g").attr("class", "grid");

// Line path
const linePath = g.append("path").attr("class", "line-path");

// Tooltips
const tooltip = d3
  .select("body")
  .append("div")
  .style("position", "absolute")
  .style("pointer-events", "none")
  .style("background", "rgba(255,255,255,0.9)")
  .style("border", "1px solid #ccc")
  .style("border-radius", "4px")
  .style("padding", "4px 8px")
  .style("font-size", "0.75rem")
  .style("display", "none");

// Global state
let dataAll = [];
let countries = [];

// All datasets
const datasetFiles = {
  births: "data/Births.txt",
  deaths: "data/Deaths.txt",
  both: "data/Gender_Rates.txt",
};

// Load and parse HMD Births.txt
d3.text("data/Births.txt").then((rawText) => {
  // Split by line, handle Windows/Unix newlines
  const lines = rawText.split(/\r?\n/);

  // Find header line (starts with "PopName")
  const headerIndex = lines.findIndex((line) =>
    line.trim().startsWith("PopName")
  );

  if (headerIndex === -1) {
    console.error("Could not find header line in Births.txt");
    return;
  }

  // Everything after headerIndex is data (until any trailing empty lines)
  const dataLines = lines
    .slice(headerIndex + 1)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  dataAll = dataLines.map((line) => {
    // Split by one or more whitespace characters
    const parts = line.split(/\s+/);
    return {
      PopName: parts[0],
      Year: +parts[1],
      Female: +parts[2],
      Male: +parts[3],
      Total: +parts[4],
    };
  });

  console.log("Parsed births records:", dataAll.length);

  // Set up country list
  countries = Array.from(new Set(dataAll.map((d) => d.PopName))).sort();

  const countrySelect = d3.select("#country-select");
  countrySelect
    .selectAll("option")
    .data(countries)
    .join("option")
    .attr("value", (d) => d)
    .text((d) => d);

  // Event listeners
  countrySelect.on("change", (event) => {
    const selectedCountry = event.target.value;
    updateLineChart(selectedCountry, getSelectedSeries());
    updateSummary(selectedCountry);
  });

  d3.select("#sex-toggle").on("change", (event) => {
    const selectedCountry = countrySelect.node().value;
    updateLineChart(selectedCountry, event.target.value);
  });

  // Initial render with the first country
  const initialCountry = countries[0];
  countrySelect.property("value", initialCountry);
  updateLineChart(initialCountry, getSelectedSeries());
  updateSummary(initialCountry);

    console.log("Parsed births records:", dataAll.length);

  // Set up global year range for sliders
  const globalMinYear = d3.min(dataAll, d => d.Year);
  const globalMaxYear = d3.max(dataAll, d => d.Year);

  yearMinInput
    .attr("min", globalMinYear)
    .attr("max", globalMaxYear)
    .attr("value", globalMinYear);

  yearMaxInput
    .attr("min", globalMinYear)
    .attr("max", globalMaxYear)
    .attr("value", globalMaxYear);

  // Change handlers for sliders
  function onYearRangeChange() {
    
    let [ymin, ymax] = getYearRange();
    if (ymin > ymax) {
      const tmp = ymin;
      ymin = ymax;
      ymax = tmp;
      yearMinInput.property("value", ymin);
      yearMaxInput.property("value", ymax);
    }

    const selectedCountry = d3.select("#country-select").node().value;
    updateLineChart(selectedCountry, getSelectedSeries());
  }

  yearMinInput.on("input", onYearRangeChange);
  yearMaxInput.on("input", onYearRangeChange);

  // Set up country list
  countries = Array.from(new Set(dataAll.map((d) => d.PopName))).sort();

});

// Helper to get currently selected series (Total / Female / Male)
function getSelectedSeries() {
  return d3.select("#sex-toggle").node().value;
}

// Update summary panel
function updateSummary(country) {
  const subset = dataAll.filter((d) => d.PopName === country);
  if (subset.length === 0) return;

  // Simple summary stats
  const minYear = d3.min(subset, (d) => d.Year);
  const maxYear = d3.max(subset, (d) => d.Year);
  const avgTotal = d3.mean(subset, (d) => d.Total);

  d3.select("#summary-panel").html(`
    <p>Country: ${country}</p>
    <p>Years: ${minYear}–${maxYear}</p>
    <p>Average total births per year: ${Math.round(avgTotal).toLocaleString()}</p>
  `);
}

// Main line chart update function
function updateLineChart(country, seriesKey) {
  
  const [yearMin, yearMax] = getYearRange();

  const subset = dataAll
    .filter(d =>
      d.PopName === country &&
      d.Year >= yearMin &&
      d.Year <= yearMax
    )
    .sort((a, b) => d3.ascending(a.Year, b.Year));

  // Update scales
  xScale.domain(d3.extent(subset, (d) => d.Year));

  const yMax = d3.max(subset, (d) => d[seriesKey]);
  yScale.domain([0, yMax]).nice();

  // Axes
  const xAxis = d3.axisBottom(xScale).ticks(8).tickFormat(d3.format("d"));
  const yAxis = d3.axisLeft(yScale).ticks(6);

  xAxisG.call(xAxis);
  yAxisG.call(yAxis);

  // Gridlines
  const yGrid = d3
    .axisLeft(yScale)
    .ticks(6)
    .tickSize(-plotWidth)
    .tickFormat("");

  yGridG.call(yGrid);

  // Line generator
  const line = d3
    .line()
    .x((d) => xScale(d.Year))
    .y((d) => yScale(d[seriesKey]));

  // Color by series
  const colorBySeries = {
    Total: "#1f77b4",
    Female: "#d62728",
    Male: "#2ca02c",
  };

  linePath
    .datum(subset)
    .attr("d", line)
    .attr("stroke", colorBySeries[seriesKey] || "#1f77b4");

  // Points for hover
  const points = g.selectAll(".point").data(subset, (d) => d.Year);

  points
    .join(
      (enter) =>
        enter
          .append("circle")
          .attr("class", "point")
          .attr("r", 3),
      (update) => update,
      (exit) => exit.remove()
    )
    .attr("cx", (d) => xScale(d.Year))
    .attr("cy", (d) => yScale(d[seriesKey]))
    .attr("fill", colorBySeries[seriesKey] || "#1f77b4")
    .on("mouseenter", (event, d) => {
      tooltip
        .style("display", "block")
        .html(
          `<strong>${country}</strong><br/>Year: ${d.Year}<br/>${seriesKey}: ${d[
            seriesKey
          ].toLocaleString()}`
        );
    })
    .on("mousemove", (event) => {
      tooltip
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 20 + "px");
    })
    .on("mouseleave", () => {
      tooltip.style("display", "none");
    });
}

// Function to allow users to select by country
function getSelectedCountries() {
  return Array.from(d3.select("#country-select").node().selectedOptions)
    .map(o => o.value);
}

// Function to allow users to select by time range
function getYearRange() {
  const min = +d3.select("#year-min").node().value;
  const max = +d3.select("#year-max").node().value;
  return [min, max];
}
