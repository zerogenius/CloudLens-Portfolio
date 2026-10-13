import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription, interval, startWith, switchMap } from 'rxjs';

type Metrics = { totalRequests:number; errorRequests:number; averageLatencyMs:number; errorRatePercent:number; generatedAt:string };
type RequestSample = { timestamp:string; method:string; path:string; statusCode:number; durationMs:number };
type AlertRule = { id:string; name:string; metric:string; threshold:number; enabled:boolean; createdAt:string };
@Component({ selector:'app-root', standalone:true, imports:[CommonModule, FormsModule, HttpClientModule], template: `
<div class="shell">
  <aside class="sidebar"><div class="brand"><span class="brand-mark">◈</span><div><b>cloudlens</b><small>OBSERVABILITY</small></div></div>
    <div class="nav-label">WORKSPACE</div><a class="nav active">▦ &nbsp; Overview</a><a class="nav" href="#requests">◷ &nbsp; Request activity</a><a class="nav" href="#alerts">⚑ &nbsp; Alert rules</a>
    <div class="side-bottom"><span class="pulse"></span><div><b>Local environment</b><small>API connection {{ connected ? 'healthy' : 'checking' }}</small></div></div>
  </aside>
  <main class="main"><header><div><div class="eyebrow">MONITORING / OVERVIEW</div><h1>Application overview</h1><p class="muted">Monitor API health, traffic and alert rules from one place.</p></div><div class="header-right"><span class="live"><i></i> LIVE</span><button class="secondary" (click)="refresh()">↻ Refresh</button></div></header>
    <div class="banner" [class.bad]="!connected"><span class="banner-icon">{{connected?'✓':'!'}}</span><div><b>{{connected?'CloudLens API connected':'Waiting for CloudLens API'}}</b><p>{{connected?'Live telemetry is being refreshed automatically.':'Start the .NET API on http://localhost:5080, then refresh.'}}</p></div></div>
    <section class="metric-grid"><article class="metric"><div class="metric-top"><span>Total requests</span><span class="metric-icon blue">↗</span></div><strong>{{metrics?.totalRequests ?? 0 | number}}</strong><small>Since API started</small><div class="mini-bars"><i *ngFor="let h of bars" [style.height.%]="h"></i></div></article>
      <article class="metric"><div class="metric-top"><span>Server errors</span><span class="metric-icon red">!</span></div><strong>{{metrics?.errorRequests ?? 0 | number}}</strong><small>HTTP status 500 and above</small><div class="metric-foot red-text">{{metrics?.errorRatePercent ?? 0}}% error rate</div></article>
      <article class="metric"><div class="metric-top"><span>Average latency</span><span class="metric-icon purple">◷</span></div><strong>{{metrics?.averageLatencyMs ?? 0}}<em> ms</em></strong><small>Average observed request duration</small><div class="metric-foot">Request timing</div></article>
      <article class="metric"><div class="metric-top"><span>Alert rules</span><span class="metric-icon amber">⚑</span></div><strong>{{alerts.length}}</strong><small>Configured rules</small><div class="metric-foot">Demo rules are not notifications</div></article></section>
    <section class="panel" id="requests"><div class="panel-head"><div><h2>Recent requests</h2><p>Latest requests observed by the API middleware</p></div><span class="count">{{requests.length}} events</span></div>
      <div class="table-wrap"><table><thead><tr><th>METHOD</th><th>ENDPOINT</th><th>STATUS</th><th>DURATION</th><th>TIME (UTC)</th></tr></thead><tbody><tr *ngFor="let r of requests"><td><span class="method">{{r.method}}</span></td><td class="path">{{r.path}}</td><td><span class="status" [class.fail]="r.statusCode>=400">{{r.statusCode}}</span></td><td>{{r.durationMs}} ms</td><td class="muted">{{r.timestamp | date:'HH:mm:ss'}}</td></tr><tr *ngIf="requests.length===0"><td colspan="5" class="empty">No requests recorded yet. Refresh the dashboard or open <code>/health/live</code>.</td></tr></tbody></table></div></section>
    <section class="panel" id="alerts"><div class="panel-head"><div><h2>Alert rules</h2><p>Store threshold rules for the monitoring demo</p></div><button class="primary" (click)="showForm=!showForm">＋ New rule</button></div>
      <form *ngIf="showForm" class="alert-form" (ngSubmit)="createAlert()"><label>Rule name<input name="name" [(ngModel)]="newName" required maxlength="80" placeholder="High error rate"></label><label>Metric<select name="metric" [(ngModel)]="newMetric"><option value="errorRatePercent">Error rate (%)</option><option value="averageLatencyMs">Average latency (ms)</option><option value="totalRequests">Total requests</option></select></label><label>Threshold<input name="threshold" [(ngModel)]="newThreshold" type="number" min="1" required></label><button class="primary" type="submit" [disabled]="saving">{{saving?'Saving…':'Create rule'}}</button></form>
      <div class="alert-list"><div class="alert-row" *ngFor="let a of alerts"><span class="alert-symbol">⚑</span><div class="alert-info"><b>{{a.name}}</b><small>{{labelMetric(a.metric)}} threshold · created {{a.createdAt | date:'medium'}}</small></div><span class="threshold">{{a.threshold}}</span><button class="delete" title="Delete rule" (click)="deleteAlert(a.id)">×</button></div><div *ngIf="alerts.length===0" class="empty">No alert rules yet. Create one to get started.</div></div>
    </section><footer>CloudLens MVP · In-memory telemetry · Last updated {{metrics?.generatedAt | date:'mediumTime'}}</footer>
  </main>
</div>
` })
export class AppComponent implements OnInit, OnDestroy {
 private http=inject(HttpClient); private sub?:Subscription;
 metrics:Metrics|null=null; requests:RequestSample[]=[]; alerts:AlertRule[]=[]; connected=false; showForm=false; saving=false; newName='High error rate'; newMetric='errorRatePercent'; newThreshold=5; bars=[25,38,32,55,42,66,50,75,48,60,86,68];
 ngOnInit(){this.sub=interval(5000).pipe(startWith(0),switchMap(()=>this.http.get<Metrics>('/api/metrics'))).subscribe({next:m=>{this.metrics=m;this.connected=true;this.loadOther()},error:()=>{this.connected=false;this.metrics=null}});}
 loadOther(){this.http.get<RequestSample[]>('/api/requests?limit=20').subscribe({next:r=>this.requests=r,error:()=>{} });this.http.get<AlertRule[]>('/api/alerts').subscribe({next:a=>this.alerts=a,error:()=>{} });}
 refresh(){this.http.get<Metrics>('/api/metrics').subscribe({next:m=>{this.metrics=m;this.connected=true;this.loadOther()},error:()=>this.connected=false});}
 createAlert(){if(!this.newName.trim()||this.newThreshold<1)return;this.saving=true;this.http.post<AlertRule>('/api/alerts',{name:this.newName,metric:this.newMetric,threshold:Number(this.newThreshold)}).subscribe({next:()=>{this.showForm=false;this.newName='';this.saving=false;this.loadOther()},error:()=>this.saving=false});}
 deleteAlert(id:string){this.http.delete('/api/alerts/'+id).subscribe({next:()=>this.loadOther()});}
 labelMetric(metric:string){return ({errorRatePercent:'Error rate',averageLatencyMs:'Average latency',totalRequests:'Total requests'} as Record<string,string>)[metric]??metric;}
 ngOnDestroy(){this.sub?.unsubscribe();}
}
