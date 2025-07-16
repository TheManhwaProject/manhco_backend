// Request coalescer to prevent duplicate API calls
export class RequestCoalescer {
  private pending = new Map<string, Promise<any>>();
  
  async coalesce<T>(key: string, fn: () => Promise<T>): Promise<T> {
    if (this.pending.has(key)) {
      return this.pending.get(key);
    }
    
    const promise = fn().finally(() => {
      this.pending.delete(key);
    });
    
    this.pending.set(key, promise);
    return promise;
  }
  
  // Get current pending requests count
  getPendingCount(): number {
    return this.pending.size;
  }
  
  // Check if a request is pending
  isPending(key: string): boolean {
    return this.pending.has(key);
  }
  
  // Clear all pending requests (use with caution)
  clearAll(): void {
    this.pending.clear();
  }
}

// Export singleton instance
export const requestCoalescer = new RequestCoalescer();