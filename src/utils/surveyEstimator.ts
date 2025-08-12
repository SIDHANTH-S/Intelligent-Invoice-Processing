import { EstimationOptions, SurveyEstimate, WeightVariable } from '../types/survey';
import _ from 'lodash';

export class SurveyEstimator {
  static calculateWeightedMean(
    data: any[],
    variable: string,
    weightColumn?: string,
    options: EstimationOptions = { weighted: false, confidenceLevel: 0.95, varianceMethod: 'taylor', finitePopulationCorrection: false }
  ): SurveyEstimate {
    const values = data
      .map(row => ({ value: parseFloat(row[variable]), weight: weightColumn ? parseFloat(row[weightColumn]) || 1 : 1 }))
      .filter(item => !isNaN(item.value) && item.weight > 0);

    if (values.length === 0) {
      throw new Error(`No valid values found for variable: ${variable}`);
    }

    const totalWeight = _.sumBy(values, 'weight');
    const weightedSum = _.sumBy(values, item => item.value * item.weight);
    const estimate = weightedSum / totalWeight;

    // Calculate variance
    const variance = this.calculateVariance(values, estimate, options.varianceMethod);
    const standardError = Math.sqrt(variance / values.length);

    // Design effect calculation
    const designEffect = options.weighted ? this.calculateDesignEffect(values) : 1;
    const effectiveSampleSize = values.length / designEffect;

    // Finite population correction
    let fpc = 1;
    if (options.finitePopulationCorrection && options.populationSize) {
      fpc = Math.sqrt((options.populationSize - values.length) / (options.populationSize - 1));
    }

    const adjustedSE = standardError * Math.sqrt(designEffect) * fpc;
    const marginOfError = this.calculateMarginOfError(adjustedSE, options.confidenceLevel, effectiveSampleSize);
    const confidenceInterval: [number, number] = [
      estimate - marginOfError,
      estimate + marginOfError
    ];

    return {
      variable,
      estimate,
      standardError: adjustedSE,
      marginOfError,
      confidenceInterval,
      sampleSize: values.length,
      effectiveSampleSize,
      designEffect
    };
  }

  static calculateWeightedProportion(
    data: any[],
    variable: string,
    category: any,
    weightColumn?: string,
    options: EstimationOptions = { weighted: false, confidenceLevel: 0.95, varianceMethod: 'taylor', finitePopulationCorrection: false }
  ): SurveyEstimate {
    const values = data
      .map(row => ({
        value: row[variable] === category ? 1 : 0,
        weight: weightColumn ? parseFloat(row[weightColumn]) || 1 : 1
      }))
      .filter(item => item.weight > 0);

    if (values.length === 0) {
      throw new Error(`No valid values found for variable: ${variable}`);
    }

    const totalWeight = _.sumBy(values, 'weight');
    const weightedSum = _.sumBy(values, item => item.value * item.weight);
    const proportion = weightedSum / totalWeight;

    // Variance for proportion
    const variance = proportion * (1 - proportion);
    const standardError = Math.sqrt(variance / values.length);

    const designEffect = options.weighted ? this.calculateDesignEffect(values) : 1;
    const effectiveSampleSize = values.length / designEffect;

    let fpc = 1;
    if (options.finitePopulationCorrection && options.populationSize) {
      fpc = Math.sqrt((options.populationSize - values.length) / (options.populationSize - 1));
    }

    const adjustedSE = standardError * Math.sqrt(designEffect) * fpc;
    const marginOfError = this.calculateMarginOfError(adjustedSE, options.confidenceLevel, effectiveSampleSize);
    const confidenceInterval: [number, number] = [
      Math.max(0, proportion - marginOfError),
      Math.min(1, proportion + marginOfError)
    ];

    return {
      variable: `${variable} (${category})`,
      estimate: proportion,
      standardError: adjustedSE,
      marginOfError,
      confidenceInterval,
      sampleSize: values.length,
      effectiveSampleSize,
      designEffect
    };
  }

  static calculateWeightedTotal(
    data: any[],
    variable: string,
    weightColumn?: string,
    options: EstimationOptions = { weighted: false, confidenceLevel: 0.95, varianceMethod: 'taylor', finitePopulationCorrection: false }
  ): SurveyEstimate {
    const meanEstimate = this.calculateWeightedMean(data, variable, weightColumn, options);
    const totalWeight = _.sumBy(data, row => weightColumn ? parseFloat(row[weightColumn]) || 1 : 1);
    
    const total = meanEstimate.estimate * totalWeight;
    const totalSE = meanEstimate.standardError * totalWeight;
    const totalMoE = meanEstimate.marginOfError * totalWeight;

    return {
      variable: `Total ${variable}`,
      estimate: total,
      standardError: totalSE,
      marginOfError: totalMoE,
      confidenceInterval: [
        total - totalMoE,
        total + totalMoE
      ],
      sampleSize: meanEstimate.sampleSize,
      effectiveSampleSize: meanEstimate.effectiveSampleSize,
      designEffect: meanEstimate.designEffect
    };
  }

  private static calculateVariance(
    values: Array<{ value: number; weight: number }>,
    mean: number,
    method: 'taylor' | 'bootstrap' | 'jackknife'
  ): number {
    switch (method) {
      case 'taylor':
        return this.taylorVariance(values, mean);
      case 'bootstrap':
        return this.bootstrapVariance(values, mean);
      case 'jackknife':
        return this.jackknifeVariance(values, mean);
      default:
        return this.taylorVariance(values, mean);
    }
  }

  private static taylorVariance(
    values: Array<{ value: number; weight: number }>,
    mean: number
  ): number {
    const totalWeight = _.sumBy(values, 'weight');
    const weightedSumSquares = _.sumBy(values, item => 
      item.weight * Math.pow(item.value - mean, 2)
    );
    return weightedSumSquares / totalWeight;
  }

  private static bootstrapVariance(
    values: Array<{ value: number; weight: number }>,
    mean: number
  ): number {
    const bootstrapSamples = 1000;
    const estimates: number[] = [];

    for (let i = 0; i < bootstrapSamples; i++) {
      const sample = this.bootstrapSample(values);
      const sampleMean = this.calculateSampleMean(sample);
      estimates.push(sampleMean);
    }

    return _.sum(estimates.map(est => Math.pow(est - mean, 2))) / (bootstrapSamples - 1);
  }

  private static jackknifeVariance(
    values: Array<{ value: number; weight: number }>,
    mean: number
  ): number {
    const n = values.length;
    const estimates: number[] = [];

    for (let i = 0; i < n; i++) {
      const sample = values.filter((_, index) => index !== i);
      const sampleMean = this.calculateSampleMean(sample);
      estimates.push(sampleMean);
    }

    const jackknifeMean = _.mean(estimates);
    const variance = ((n - 1) / n) * _.sum(estimates.map(est => Math.pow(est - jackknifeMean, 2)));
    
    return variance;
  }

  private static bootstrapSample(values: Array<{ value: number; weight: number }>): Array<{ value: number; weight: number }> {
    const sample: Array<{ value: number; weight: number }> = [];
    for (let i = 0; i < values.length; i++) {
      const randomIndex = Math.floor(Math.random() * values.length);
      sample.push(values[randomIndex]);
    }
    return sample;
  }

  private static calculateSampleMean(values: Array<{ value: number; weight: number }>): number {
    const totalWeight = _.sumBy(values, 'weight');
    const weightedSum = _.sumBy(values, item => item.value * item.weight);
    return weightedSum / totalWeight;
  }

  private static calculateDesignEffect(values: Array<{ value: number; weight: number }>): number {
    const weights = values.map(v => v.weight);
    const meanWeight = _.mean(weights);
    const sumSquaredWeights = _.sum(weights.map(w => w * w));
    const sumWeights = _.sum(weights);
    
    return (sumSquaredWeights * values.length) / (sumWeights * sumWeights);
  }

  private static calculateMarginOfError(
    standardError: number,
    confidenceLevel: number,
    sampleSize: number
  ): number {
    const alpha = 1 - confidenceLevel;
    const tValue = this.getTValue(alpha / 2, sampleSize - 1);
    return tValue * standardError;
  }

  private static getTValue(alpha: number, df: number): number {
    // Simplified t-distribution critical values
    const tTable: { [key: number]: number } = {
      0.025: df > 30 ? 1.96 : df > 20 ? 2.086 : df > 10 ? 2.228 : 2.571,
      0.05: df > 30 ? 1.645 : df > 20 ? 1.725 : df > 10 ? 1.812 : 2.015,
      0.01: df > 30 ? 2.576 : df > 20 ? 2.845 : df > 10 ? 3.169 : 3.707
    };
    
    return tTable[alpha] || 1.96;
  }

  static winsorizeData(
    data: any[],
    variable: string,
    lowerPercentile: number = 0.05,
    upperPercentile: number = 0.95
  ): any[] {
    const values = data
      .map(row => parseFloat(row[variable]))
      .filter(v => !isNaN(v))
      .sort((a, b) => a - b);

    if (values.length === 0) return data;

    const lowerIndex = Math.floor(values.length * lowerPercentile);
    const upperIndex = Math.floor(values.length * upperPercentile);
    
    const lowerBound = values[lowerIndex];
    const upperBound = values[upperIndex];

    return data.map(row => {
      const value = parseFloat(row[variable]);
      if (isNaN(value)) return row;

      return {
        ...row,
        [variable]: Math.max(lowerBound, Math.min(upperBound, value))
      };
    });
  }
}