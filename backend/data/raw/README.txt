The folder contains Historical Data Logs (48 files).

There are two files for each cell:
- throughput-cell-<id>.dat
- pkt-stats-cell-<id>.dat
<id> is used to identify cell (throughput logs and pkt-stats logs associated with the same cell have the same <id>).

File throughput-cell-<id>.dat content:
- Contains number of eCPRI bits transmitted by DU per radio symbol (for given cell). Symbol duration is 500us / 14 = ~35.7us
- Format: Text file with two columns separated by space
	- 1st column: timestamp [seconds] - indicates start of symbol transmission over FH interface
	- 2nd column: number of bits [kbit] - indicates number of kilobits (1000 bits) transmitted over FH within symbol interval, assume that bits are uniformly spread over the symbol interval
  Note: data rate per symbol can be calculated as: number of bits / symbol duration, e.g.: 676.933 * 1000 / 0.0000357 = 18.96 Gbps
- File entries may have reverted order, so they should be sorted based on timestamp before further processing (e.g.: using command "sort -n -k1,1 input_file > sorted_file")
- Due to limitations of the measurement mechanism, the file may contain a few entries with number of bits per symbol that is significantly higher than for other symbols, such symbols should be treated as measurement errors and eliminated (replaced by 0 bits)
- Example content:
1.01 676.933
1.01003571 0
1.01007143 0
1.01 0
1.01003571 0
	
File pkt-stats-cell-<id>.dat content:
- Contains packet statistics per slot (i.e. 14 consecutive symbols) as collected on RU
- Format: Text file with four columns separated by spaces
	- 1st column: timestamp [seconds] - indicates start of slot transmission over FH interface
		Note: Timestamps are collected on RU, so they can be shifted by fixed time interval (up to 1.5sec) between cells on different RUs, and in comparison to throughput logs captured on DU. There could be fixed time shift (up to 1.5sec) between throughput and pkt-stats logs for the same cell.
	- 2nd column: txPackets [packet] - indicates number of packets transmitted by DU
	- 3rd column: rxPackets [packet] - indicates number of packets received by RU (including too late packets)
		Note: packet loss (dropped by switch) can be detected by comparing txPackets with rxPackets
	- 4th column: tooLateRxPackets [packet] - indicates number of packets received by RU too late for processing, so finally discarded by RU
		Note: too late packets are treated the same way as packets dropped by switch
- Example content:
<slot> <slotStart> <txPackets> <rxPackets> <tooLateRxPackets>
1.00315 0 0 0
1.00365 0 0 0
1.00465 16 16 0
1.00515 16 16 0
1.00565 20 20 0
