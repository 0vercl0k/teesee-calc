// Axel '0vercl0k' Souchet - March 13 2021
'use strict';

//
// Format the compensation number.
//

function formatComp(Comp) {
  let Unity = '';
  if (Comp >= 1_000_000) {
    Comp /= 1_000_000;
    Unity = 'm';
  } else if (Comp >= 1_000) {
    Comp /= 1_000;
    Unity = 'k';
  }

  return `$${Comp.toLocaleString()}${Unity}`;
}

class Teesee_t {
  constructor(Name, Base, Benefits, SignOnBonuses, Stocks, Perf) {

    //
    // Sanitize the types. Type-safety uh?
    //

    if (typeof(Base) != 'number') {
      throw `Base is expected to be a number`;
    }

    if (typeof(Benefits) != 'number') {
      throw `Benefits is expected to be a number`;
    }

    for (const SignOnBonus of SignOnBonuses) {
      if (typeof(SignOnBonus) != 'number') {
        throw `SignOnBonus is expected to be a number`;
      }
    }

    if (Stocks == undefined ||
      Stocks.Schedule == undefined ||
      Stocks.Amount == undefined) {
        throw `Stocks is malformated`;
    }

    if (typeof(Stocks.Amount) != 'number') {
      throw `Stocks.Amount is expected to be a number`;
    }

    for (const Percent of Stocks.Schedule) {
      if (typeof(Percent) != 'number') {
        throw `Each value is expected to be a number`;
      }

      if (Percent < 0 || Percent > 100) {
        throw `Each value is expected to be a %age`;
      }
    }

    if (Perf == undefined ||
      Perf.Cash == undefined ||
      Perf.Stocks == undefined ||
      Perf.Schedule == undefined) {
        throw `Perf is malformated`;
    }

    for (const Percent of Perf.Schedule) {
      if (typeof(Percent) != 'number') {
        throw `Each value is expected to be a number`;
      }

      if (Percent < 0 || Percent > 100) {
        throw `Each value is expected to be a %age`;
      }
    }

    if (typeof(Perf.Cash) != 'number') {
      throw `Perf.Cash is expected to be a number`;
    }

    if (typeof(Perf.Stocks) != 'number') {
      throw `Perf.Stocks is expected to be a number`;
    }

    //
    // Initialize the members.
    //

    this.Name_ = Name;
    this.Base_ = Base;
    this.Benefits_ = Benefits;
    this.SignOnBonuses_ = SignOnBonuses;
    this.Stocks_ = Stocks;
    this.Perf_ = Perf;
  }

  //
  // Get the name of the company.
  //

  Name() {
    return this.Name_;
  }

  //
  // Get the breakdown of a specific year of compensation.
  //

  Year(N) {
    const YearIdx = N - 1;
    let Cash = this.Base_ + this.Perf_.Cash;
    let Benefits = this.Benefits_;
    let Stocks = 0;

    //
    // Account for the sign on bonus.
    //

    if (YearIdx < this.SignOnBonuses_.length) {
      const SignOn = this.SignOnBonuses_[YearIdx];
      Cash += SignOn;
    }

    //
    // Calculate the stock refreshers stacking on top of each-other
    // every year.
    //

    const Grants = new Map();

    //
    // Take care of the initial stock grant.
    //

    for (const [Idx, Schedule] of this.Stocks_.Schedule.entries()) {
      const Percent = Schedule / 100;
      Grants.set(Idx, this.Stocks_.Amount * Percent);
    }

    //
    // Take care of the yearly stock refreshers.
    //

    for (let Year = 0; Year < N; Year++) {
      for (const [Idx, Schedule] of this.Perf_.Schedule.entries()) {
        const Percent = Schedule / 100;
        const K = Year + Idx + 1;
        const Prev = Grants.has(K) ? Grants.get(K) : 0;
        Grants.set(K, Prev + this.Perf_.Stocks * Percent);
      }
    }

    //
    // Get the appropriate amount for the year.
    //

    Stocks += Grants.get(YearIdx);

    //
    // Return the breakdown.
    //

    return {
      Total: Cash + Stocks + Benefits,
      Benefits: Benefits,
      Cash: Cash,
      Stocks: Stocks
    };
  }

  //
  // Get the total amount projected over a period of time.
  //

  TotalComp(N) {
    let Comp = 0;
    for (let YearIdx = 0; YearIdx < N; YearIdx++) {
      Comp += this.Year(YearIdx + 1).Total;
    }
    return Comp;
  }
};

//
// Define the set of colors we'll use for a maximum of 3
// different datasets.
//

const Colors = [
  {Cash: 'rgb(255, 99, 132)', Stocks: 'rgb(255, 144, 99)', Benefits: 'rgb(255, 221, 99)'},
  {Cash: 'rgb(54, 162, 235)', Stocks: 'rgb(54, 235, 217)', Benefits: 'rgb(99, 211, 255)'},
  {Cash: 'rgb(200, 255, 181)', Stocks: 'rgb(181, 200, 255)', Benefits: 'rgb(255, 181, 199)'},
  {Cash: 'rgb(231, 252, 146)', Stocks: 'rgb(146, 231, 252)', Benefits: 'rgb(231, 252, 146)'},
];

class TeeseeApp_t {
  constructor(Years) {
    this.Teesees_ = [];
    this.Chart_ = null;
    this.Years_ = Years;
    this.Ctx_ = document.getElementById('chart').getContext('2d');
    this.Labels_ = [];
    this.Opts_ = {
      maintainAspectRatio: false,
      responsive: true,
      legend: {
        display: false,
      },
      title: {
        display: true,
        fontColor: 'white',
        padding: 25,
      },
      scales: {
        ticks: { fontColor: 'white' },
        pointLabels: { fontColor: 'white' },
        xAxes: [{
          stacked: true,
          gridLines: {
            color: 'rgba(255, 255, 255, 0.2)'
          },
        }],
        yAxes: [{
          stacked: true,
          gridLines: {
            color: 'rgba(255, 255, 255, 0.2)'
          },
          ticks: {
            callback: (Value) => {

              //
              // Include a dollar sign in the ticks.
              //

              return `$${Value.toLocaleString()}`;
            }
          }
        }],
      },
      tooltips: {
        callbacks: {

          //
          // Format the label as currency.
          //

          label: (TooltipItem, Data) => {
            let Label = Data.datasets[TooltipItem.datasetIndex].label || '';
            if (Label) {
              Label += ': ';
            }

            const Value = Math.round(TooltipItem.yLabel * 100) / 100;
            Label += `$${Value.toLocaleString()}`;
            return Label;
          }
        }
      },
      plugins: {
        datalabels: {
          align: 'end',
          anchor: 'end',
          color: 'white',
          formatter: (_, Ctx) => {

            //
            // Inspired from:
            // https://chartjs-plugin-datalabels.netlify.app/samples/advanced/custom-labels.html
            //

            //
            // What we are trying to do here is to basically display the TC
            // for the year. The thing is that this callback gets invoked
            // for every part of the compensation.
            // So the idea is to only do work when we get called for the last
            // part of the compensation.
            //

            const CurrentDataset = Ctx.dataset;
            const Company = CurrentDataset.stack;
            const CompanyDatasets = Ctx.chart.data.datasets.filter(Dataset => {
              return Dataset.stack == Company;
            });

            const LastDatasetName = CompanyDatasets[CompanyDatasets.length - 1].label;
            if (LastDatasetName != Ctx.dataset.label) {
              return '';
            }

            //
            // Then, we sum the right data together.
            //

            let Total = 0;
            for (const Dataset of CompanyDatasets) {
              Total += Dataset.data[Ctx.dataIndex];
            }

            return formatComp(Total);
          }
        }
      }
    };

    //
    // Initialize the labels.
    //

    this.buildLabels();

    //
    // Draw the empty chart!
    //

    this.draw();
  }

  //
  // Get a Teesee from its Name, or null.
  //

  getTeeseeByName(Name) {
    return this.Teesees_.find((E) => {
      return Name == E.Name();
    });
  }

  //
  // Reset.
  //

  reset() {

    //
    // Empty it out!
    //

    this.Teesees_.length = 0;

    //
    // Draw.
    //

    return this.draw();
  }

  //
  // Add a teesee.
  //

  addTeesee(Teesee) {

    //
    // Check if we have alreayd a matching entry.
    //

    const ExistingIndex = this.Teesees_.findIndex((E) => {
      return Teesee.Name() == E.Name();
    });

    if (ExistingIndex != -1) {

      //
      // If we already have a candidate, then replace it.
      //

      this.Teesees_[ExistingIndex] = Teesee;
    } else {

      //
      // Otherwise, push it down.
      //

      this.Teesees_.push(Teesee);
    }

    //
    // Draw.
    //

    return this.draw();
  }

  //
  // Build the labels for the chart.
  //

  buildLabels() {
    this.Labels_ = [];
    for (let Year = 1; Year < this.Years_ + 1; Year++) {
      this.Labels_.push(`Year ${Year}`);
    }
  }

  //
  // Build the title of the char.
  //

  updateTitle() {
    const Chunks = [];
    for (const Teesee of this.Teesees_) {
      const TotalComp = Teesee.TotalComp(this.Years_);
      Chunks.push(`${Teesee.Name()} (${formatComp(TotalComp)} total)`);
    }

    const Title = Chunks.join(' VS ');
    this.Opts_.title.text = Title == '' ? 'Compensation over time' : Title;
  }

  //
  // Draw the chart.
  //

  draw() {

    //
    // Walk every teesees..
    //

    const Datasets = [];
    const TeeseeVariables = [];
    for(const [Idx, Teesee] of this.Teesees_.entries()) {

      //
      // Prepare the URL variables for this teesee.
      //

      const Pairs = [];
      Pairs.push(['na', Teesee.Name()]);
      Pairs.push(['ba', Teesee.Base_]);
      Pairs.push(['be', Teesee.Benefits_]);
      Pairs.push(['si', Teesee.SignOnBonuses_.join('/')]);
      Pairs.push(['in', Teesee.Stocks_.Amount]);
      Pairs.push(['sc', Teesee.Stocks_.Schedule.join('/')]);
      Pairs.push(['pe', Teesee.Perf_.Cash]);
      Pairs.push(['ps', Teesee.Perf_.Stocks]);
      Pairs.push(['pc', Teesee.Perf_.Schedule.join('/')]);
      TeeseeVariables.push(Pairs);

      //
      // For each one of them figure out the breakdown between
      // cash / stocks / benefits.
      //

      for (const Breakdown of ['Cash', 'Stocks', 'Benefits']) {

        //
        // Figure out the value over the years for each of of them.
        //

        const Data = [];
        for (let Year = 1; Year < this.Years_ + 1; Year++) {
          Data.push(Teesee.Year(Year)[Breakdown]);
        }

        //
        // Push the dataset.
        //

        Datasets.push({
          label: `${Teesee.Name()}: ${Breakdown}`,
          data: Data,
          barPercentage: 0.5,
          fill: false,
          backgroundColor: Colors[Idx % Colors.length][Breakdown],
          borderColor: Colors[Idx % Colors.length][Breakdown],
          stack: Teesee.Name(),
          fill: false,
          borderWidth: 1
        });
      }
    }

    //
    // Destroy the chart if we had one.
    //

    if (this.Chart_ != null) {
      this.Chart_.destroy();
    }

    //
    // Draw the chart.
    //

    this.updateTitle();
    this.Chart_ = new Chart(this.Ctx_, {
      type: 'bar',
      data: {
        labels: this.Labels_,
        datasets: Datasets,
      },
      options: this.Opts_
    });

    //
    // Prepare the URL.
    //

    const Url = [];
    for (const [Idx, Pairs] of TeeseeVariables.entries()) {
      for (const Pair of Pairs) {
        const Key = `${Pair[0]}${Idx}`;
        const Value = encodeURI(Pair[1]);
        Url.push(`${Key}=${Value}`);
      }
    }

    //
    // Update the URL.
    //

    const NewUrl = `${window.location.origin}${window.location.pathname}?${Url.join('&')}`;
    window.history.replaceState({}, document.title, NewUrl);
    document.getElementById('url').value = NewUrl;
  }

  //
  // Update the years.
  //

  updateYears(Src) {

    //
    // Sanitize the years.
    //

    const NewYears = Number(Src.value);
    if (NewYears < 0 || NewYears > 10) {
      throw `NewYears is wrong`;
    }

    //
    // Update the new value.
    //

    this.Years_ = NewYears;

    //
    // Update the associated label.
    //

    this.buildLabels();
    this.draw();
  }
};