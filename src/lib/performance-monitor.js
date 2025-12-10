// Performance monitoring utility for online user tracking
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      heartbeatTimes: [],
      fetchTimes: [],
      apiErrors: 0,
      totalRequests: 0
    };
  }

  recordHeartbeat(duration) {
    this.metrics.heartbeatTimes.push(duration);
    this.metrics.totalRequests++;
    
    // Keep only last 50 measurements
    if (this.metrics.heartbeatTimes.length > 50) {
      this.metrics.heartbeatTimes.shift();
    }
  }

  recordFetch(duration) {
    this.metrics.fetchTimes.push(duration);
    this.metrics.totalRequests++;
    
    // Keep only last 50 measurements
    if (this.metrics.fetchTimes.length > 50) {
      this.metrics.fetchTimes.shift();
    }
  }

  recordError() {
    this.metrics.apiErrors++;
  }

  getAverageHeartbeatTime() {
    if (this.metrics.heartbeatTimes.length === 0) return 0;
    const sum = this.metrics.heartbeatTimes.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.metrics.heartbeatTimes.length);
  }

  getAverageFetchTime() {
    if (this.metrics.fetchTimes.length === 0) return 0;
    const sum = this.metrics.fetchTimes.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.metrics.fetchTimes.length);
  }

  getErrorRate() {
    if (this.metrics.totalRequests === 0) return 0;
    return Math.round((this.metrics.apiErrors / this.metrics.totalRequests) * 100);
  }

  getReport() {
    return {
      avgHeartbeat: this.getAverageHeartbeatTime(),
      avgFetch: this.getAverageFetchTime(),
      errorRate: this.getErrorRate(),
      totalRequests: this.metrics.totalRequests,
      totalErrors: this.metrics.apiErrors
    };
  }

  logReport() {
    const report = this.getReport();
    console.log('🔍 Online Tracking Performance Report:', {
      'Avg Heartbeat Time': `${report.avgHeartbeat}ms`,
      'Avg Fetch Time': `${report.avgFetch}ms`,
      'Error Rate': `${report.errorRate}%`,
      'Total Requests': report.totalRequests,
      'Total Errors': report.totalErrors
    });
  }
}

export const performanceMonitor = new PerformanceMonitor();